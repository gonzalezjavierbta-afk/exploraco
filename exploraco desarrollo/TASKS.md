# TASKS.md - ExploraCO

Tablero operativo del proyecto (AI-DOS Cap. 9.4)[cite: 1]. Cada tarea incluye: ID, Prioridad, Responsable, Estado, Dependencia, Sprint, Detalle t\u00e9cnico y Evidencia f\u00edsica de \u00e9xito.

## TABLERO ACTIVO / INDICE

> Vista rapida del tablero. Para continuar, revisar aqui las tareas no completadas y
> saltar a la seccion correspondiente; el historico de paginas dinamicas esta en
> TASKS_ARCHIVO.md (contenido completo, Cero Borrado Logico).

### Tareas no completadas / estado actual

- **CERRADA / COMMITEADA Y PUSHEADA (2026-10-04; commit `8315fb0` en `main`; anterior `d9f2878`).** **TSK-177 / ADR-077 ENMIENDA 1** -- Misiones desplegables por ESTADO + galeria de perfil dentro del modal de subida + boton "+ Subir material" en "Gestion del Museo".
- **Alcance:** 3 cambios de UI en `mi-perfil.html` + 2 smokes afectados. `api/*` sin tocar (**8/8 INTACTO**, ADR-010); sin migracion ni endpoint nuevo.
- **Verificacion (medida):** `npm test` EXIT 0 (22 pasos, 0 FAIL); `smoke_grupos_perfil.js` 73 -> 109 (109/109 PASS); `smoke_042` 30 -> 45; divs 526/526; residuos del modulo retirado = 0; ASCII 0 bytes > 127.
- **Decision (fuente unica del argumento):** `DECISIONS.md` **ADR-077 ENMIENDA 1** -- Misiones es la 5.a superficie de `pfGruposRender()` y el eje pasa a ser por ESTADO; NO es un ADR nuevo. Detalle de ejecucion: seccion TSK-177 al final de este fichero.
- **Anulacion:** la nota de **TSK-160** que declaraba retirado `#btn-museo-subir` queda ANULADA en ese punto (peticion del operador); el `id` viejo no vuelve, la capacidad si.
- **Deuda abierta:** (a) QA runtime manual del modal, sin cobertura automatica; (b) `[DEUDA-EXPRESS]` `onerror` que degrada a `opacity=.3`; (c) pase documental tardio, por indicacion del operador.


- **CERRADA / EN WORKING TREE (2026-10-04; pase documental unico R2; commit PENDIENTE):** **TSK-176 - Realineacion del hero y del posicionamiento de la HOME (`index.html`; copy + CSS; sin ADR).** (1) Eyebrow `.hsey`: "Directorio turistico oficial de Colombia" -> "**Plataforma de turismo interactivo**" (se conservan la bandera y los `span` decorativos). (2) Tira de categorias `.htag` ("Hospedajes / Comida / Lugares / Eventos culturales") **ELIMINADA**: se borro el HTML y su regla CSS muerta; ocupaba el hueco entre el logo y la barra de busqueda. (3) Typo corregido: la pastilla de comida decia "Comidanomia", ahora dice "**Comida**". (4) Las **4 pastillas de categoria del hero (`.hcat`) ya no se encienden en `--gold`**: cada una usa el color que su item ya tiene en el directorio (Hospedajes `#3B82F6`, Comida `#EF4444`, Lugares `#22C55E`, Eventos `#A855F7`); el `:hover` tambien toma su color de categoria y el estado encendido suma un fondo translucido del mismo color; **la regla generica unica se sustituyo por 8 reglas por categoria**. Los botones de "Destacados" (`.dc-btn`) **se dejan en gold por decision del operador**; el JS de filtros no se toco. (5) **Meta/OG/Twitter y footer de la HOME realineados** con el nuevo posicionamiento: `meta description`, `og:title`, `og:description`, `twitter:title`, `twitter:description` y el `.fdesc` del footer; **intactos** `canonical`, `og:url`, `og:image`, `og:type`, `og:site_name` y el `<title>`. **Un solo archivo** (`index.html`; 16 inserciones / 11 borrados), **8/8 endpoints INTACTO** (ADR-010), sin migraciones, `index_pre_full.html` sin tocar (backup). **SIN ADR nuevo**: es copy y CSS, no arquitectura. Verificacion: copy nuevo **7/7**; `htag` **0**; `Comidanom` **0**; "oficial de Colombia" **0** en `index.html`; balance de divs **368/368**; bloques `<script>` **11/11** (el 12 es un comentario HTML preexistente); cascada correcta porque `.hcat[data-cat="x"].on` gana a `.hcat`. Pendientes que quedan abiertos: rebrand global, eyebrow de "Destacados" y la deuda tecnica de los hex de `.hcat`. Detalle en la seccion "Realineacion del hero y del posicionamiento de la HOME".

- **CERRADA / EN WORKING TREE (2026-10-04; pase documental unico R2; commit PENDIENTE):** **TSK-175 / ADR-083 - El tier lo fija el MODELO ACTIVO de cada turno: 2 primarios sin `model:` (roster 20 -> 18) + invariante de coste de prohibicion a atribucion.** Ver detalle en la seccion "Prioridad TIER POR MODELO ACTIVO + ATRIBUCION DE COSTE".

- **CERRADA / EN WORKING TREE (2026-10-02; commit PENDIENTE):** **TSK-174 / ADR-080 / ADR-081 - Tanda de 6 cambios de UI en `mi-perfil.html`, `comunidad.html` y `mercado.js`.** (T1) Las cards de mision (`pf-misiones`) se muestran acortadas a una linea con truncado y `title`: se elimino el volcado crudo de IDs de requisito que inflaba la tarjeta; helper de render dentro de `cargarMisiones`, CSS en el silo `#pf-misiones`. (T2) **Se RETIRA del perfil el modulo Hoja de Vida del Artista** (`#pf-cv`, `cargarHojaDeVida`, `v61GuardarHojaDeVida`, regla `.pf-v61 .v61-cv-obra`) y se borran los helpers cliente `ExploraCO.miHojaDeVida`/`ExploraCO.guardarHojaDeVida` de `usuario-session.js`; en su lugar `pf-museo-preview` pasa de la pestana `museo` a la `perfil`. **El backend `artista_cv` y su tabla quedan INTACTOS**: la retirada es solo de UI (**ADR-080**). (T3) **La pestana Mapa de Comunidad pasa de DOS mapas Leaflet a UNO SOLO**: `mymapa.js` crea la instancia unica sobre `#av-map-container` (`data-cm-mapa="1"`), desaparece `mm-personal-map` e `initAudiovisualMap` se engancha a esa instancia en vez de crear la suya (**ADR-081**); ambas fuentes (mapas personales y media audiovisual) conviven con los filtros y chips operando sobre el conjunto. (T4) "Mis lugares guardados" y "Lugares visitados" del tab Museo dejan de renderizar HTML crudo y pasan por el helper canonico **NUEVO `lugarCardHTML`** enrutado por `pfGruposRender`, con paridad visual; el CSS global `.lugar-*` se sustituye por el silo atomico `#pf-lugares`. (T5) El tab Inventario **deja de mostrar el catalogo de tienda**: se eliminan el titulo de tienda, `#pf-tienda-chips`, `#pf-tienda`, `cargarTienda`, `renderTiendaChips`, `setTiendaFiltro`, `categoriaConsumible`, `PF_TIENDA_CATS`, `PF_TIENDA_CAT`, `PF_CAT_CONSUMIBLE` y el CSS `.store-*` / `.tienda-chip*`; se conserva `cargarInventario` con su filtro `cantidad > 0`, que ya era correcto. (T6) En la vista de **COMUNIDAD** del Mercado ahora se ve todo el producto a la venta: las ofertas se agrupan por **TODAS** las Casas (`cargarOfertasTodas`, `_ofertasPorCasa`) en vez de solo la Casa seleccionada, mas catalogo completo con filtros "todos / Lo tienes / Disponible" y buscador; cache-busting a `mercado.js?v=2` en `comunidad.html` y `mi-perfil.html`. La validacion de propiedad al publicar **se mantiene y se refuerza en cliente** con `maxPublicable`/`invCant` (VER mas ya no habilita PUBLICAR mas; la validacion real sigue en el servidor). **8/8 endpoints INTACTO**; sin migraciones; sin cambios de `api/*`. Detalle en TASKS.md TSK-174 y DECISIONS.md ADR-080/ADR-081.
- **CERRADA / EN WORKING TREE (2026-10-02; commit PENDIENTE; requiere REINICIAR OpenCode):** **TSK-172 / ADR-078 - Permisos totales (ADR nuevo) + economia de turnos + smoke permanente de los grupos de "Mi perfil".** Tanda de **optimizacion de agentes y permisos**, diagnose de la de 18.028.203 tokens de TSK-171: el gasto no fue trabajo, fue turnos con contexto re-leido. (1) **Permisos:** `opencode.json` de 5 a **14 claves todas en `allow`**; **causa raiz hallada: `external_directory` NO existia** (era justo la clave que hacia que opencode pidiera autorizacion para rutas fuera del repo) y `webfetch`/`websearch` estaban en `deny`. **19** de los 20 agentes: `webfetch`/`websearch` `deny` -> `allow` y `bash: ask` -> `allow` (`free-plan`, `plan`); `research-agent.md` ya estaba en `allow`. **Excepcion conservada a proposito:** `edit: deny` en `@explore`/`@plan`/`@free-plan` y `bash: deny` en `@explore`, porque **bloquean, no preguntan** (separacion de roles ADR-006/ADR-074). **Friccion operativa:** opencode **no hace hot-reload**; sin reiniciar los permisos no rigen. Riesgo aceptado: `bash: allow` sin patrones ejecuta cualquier comando sin confirmar. (2) **Economia:** `AGENTS.md` §3 reglas 12 (formula medida), **17** (15 turnos / 500.000 tokens por `task`), **18** (higiene de consumo) y **19** (permisos); corregido `mi-perfil.html` a **~379 KB** en la regla 10; `qa-auditor.md` gana la seccion **"Presupuesto de turnos (OBLIGATORIO)"** (`:17-31`) con 7 reglas duras y `edit: allow` mantenido (lo necesita para su arnes en `%TEMP%`). (3) **NUEVO `scripts/smoke_grupos_perfil.js`** (1.141 lineas): convierte en test reproducible la cobertura de los 4 modulos agrupados de `mi-perfil.html`, que antes solo existia como arnes temporal borrado. **73/73 PASS, exit 0, 2,0 s, sin dependencias y sin red.** **GATE PERMANENTE:** `package.json` -> `scripts.test` **termina en `&& node scripts/smoke_grupos_perfil.js`** (21 pasos = 1 guard + **20 smokes**, el nuevo es el ultimo) y se anadio el alias `smoke:grupos`; `npm test` completo -> **20 suites, 0 FAIL, exit 0**. La cobertura de los 4 modulos agrupados deja de depender de que alguien la ejecute a mano: deja de poder morir en silencio. Deuda viva extraida a **TSK-173**. Bug de instrumentacion de QA corregido: **BUG-098 / BUG-CONFIG-7**. Verificacion: conteos reales de permisos en los 20 agentes, `git status` = 19 ficheros `.md` de agente, `smoke_grupos_perfil.js` 73/73, `express_check mi-perfil.html` divs 563/563. **NO se toca `api/*` (8/8 INTACTO)**; sin migraciones; sin cambios en produccion. Deuda: commit + **REINICIAR OpenCode**; 26 FAIL globales de `express_check`; timeout de `express_check` en corrida completa; auditar o diferir `pfAplicarTab()`. Detalle en TASKS.md TSK-172 y DECISIONS.md ADR-078.
- **COMPLETADA / COMMITEADA Y PUSHEADA (2026-09-30; `main` == `origin/main` = `d4ab733`):** **TSK-169 / ADR-075 - Control compartido de pantalla completa de mapas + limpieza y reorden del home (UI/estilos).** NUEVO `mapa-fullscreen.js` (271 lineas, ASCII puro, IIFE ES5, `window.MapaFullscreen` + `module.exports`): `attach({target,mapEl,getMap,label})` idempotente por target, boton ARRIBA-DERECHA DENTRO del contenedor, Fullscreen API nativa + fallback CSS `.mfs-pseudo` (iPhone Safari), `map.invalidateSize()` al entrar/salir. `admin.html`: control en los 2 mapas (`esb-mini-map-wrap`/`map-picker-el`) + limpieza de CSS muerto (6 reglas `.mpm-*`, `.esb-mini-map` activada 150->160px, `.editor-sidebar-wrap`->`.editor-sidebar`, selectores truncados `.dashboard-`/`.ws-`). `index.html`: `#mapa-section` movido tras el hero (delta de bytes 0), `.mapa-filters` como overlay de chips dentro del mapa, mobile con lista colapsable (`toggleMapaLista`), modulo `bands` ELIMINADO (divs 388 -> 371). Bugs corregidos: **BUG-095** (modal `map-picker` no abria: faltaba la clase `map-picker-modal`) y **BUG-096** (drawer invisible en pantalla completa: era hermano del contenedor). Verificacion: `npm test` **EXIT 0**; `express_check index.html` divs **371/371**; `express_check admin.html` divs **1082/1082**; `verificar-capa-gratis.js` OK. Commits: `cbd33e0` (mapa), `1b58f3a`, `55a2f30`, `d4ab733`. **8/8 endpoints INTACTO**; sin migraciones. Deuda `[DEUDA-EXPRESS]` en TASKS.md TSK-169.
- **CERRADA / EN WORKING TREE (2026-10-01; commit PENDIENTE; requiere REINICIAR OpenCode):** **TSK-170 / ADR-076 - Roster unico de 20 agentes (sin pares espejo) + retiro de la ruta hibrida + `AGENTS.md` en la raiz.** Roster **27 -> 20**: 13 `*-free` renombrados al nombre de dominio (agente unico), RETIRADOS los 4 `-pro`, `hybrid-plan`/`hybrid-build`, `paid-plan`/`paid-build`; `exp-pickle-free` fusionado en `js-silo-dev`; NUEVOS `plan`/`build` (primarios sin `model:` propio); los 16 especialistas con `model: opencode/space-bunny-free` explicito. NUEVO `AGENTS.md` en la raiz (seccion 0 tier obligatorio con `question`, seccion 1 matriz de 16 dominios, seccion 2 gates de riesgo, seccion 3 16 reglas, seccion 4 indice de skills). 3 skills despublicadas (`batch-create`, `gemini-research`, `ingest-eventos`; 14 -> 11) con sus prompts conservados en `.opencode/prompts/`; 3 skills nuevas portadas (`anti-absorcion`, `eficiencia-recursos`, `templates`). NUEVOS `scripts/validate_ficha.js`, `scripts/usage_report.js` (`npm run usage:tanda`), `scripts/session_close.js` (`npm run session:close`); guard reescrito para clasificar por `mode` (no por sufijo). `opencode.json`: `subagent_depth` 2 -> 1 y `question: allow`. Umbral de lectura 200 KB -> **150 KB**. Bugs cerrados: **BUG-034** y **BUG-088**. Verificacion: `.opencode/agent/*.md` = 20; skills = 11; `verificar-capa-gratis.js` = `20 | gratis: 20 | de pago: 0` OK. **8/8 endpoints INTACTO**; sin migraciones; sin cambios en produccion. Deuda: commit pendiente; las 3 skills `agentes-roster`/`modelos-verificados`/`reglas-de-oro` NO existen. Detalle en TASKS.md TSK-170 y DECISIONS.md ADR-076.
- **IMPLEMENTADO EN WORKING TREE / VERIFICADO (2026-09-30; commit/deploy PENDIENTES; requiere REINICIAR OpenCode):** **TSK-165 / ADR-074 - Restauracion de la capa gratuita de agentes (modelo de 3 capas: free / hibrido / pago).** `opencode.json` `model`/`small_model` -> `opencode/space-bunny-free`; 17 `*-free` sin `model:` (heredan del primario); `free-build`/`free-plan` y `hybrid-build`/`hybrid-plan` -> `opencode/space-bunny-free`; NUEVOS `paid-build`/`paid-plan` y 4 pines `-pro` (`opencode-go/deepseek-v4.1-flash`). Roster **19 -> 27** (21 gratis, 6 de pago). NUEVO guard `scripts/ejecucion/verificar-capa-gratis.js` (primer paso de `npm test`; `npm run coste:gratis`) + `npm run cuota:tanda`. Verificacion: conteo real 27 agentes; `npm test` **VERDE (exit 0)**; `opencode run --agent hybrid-build` delego a `@exp-pickle-free` con `cost=0.000000`. Bug de gobernanza: **BUG-094** (premisa incompleta de BUG-092; BUG-092 sigue CERRADO). Seguimiento: **TSK-166** (calidad de `space-bunny-free`), **TSK-167** (revisar allowlist FREE), **TSK-168** (evaluar pines `-pro` SEO/admin). **8/8 endpoints intacto**; sin migraciones. Detalle en TASKS.md TSK-165..TSK-168.
- **IMPLEMENTADO EN WORKING TREE / VERIFICADO (2026-09-30; commit/deploy PENDIENTES):** **TSK-164 / ADR-073 - Migracion de identidad ExploraCO -> LATAWEL.** Alcance: SOLO cambio de identidad sobre la estructura actual (NO se redisenaron las 20 pantallas). Marca LATAWEL (tagline "What to do?"; descriptor "plataforma de turismo interactivo"); dominio https://latawel.com VIVO (el antiguo exploraco.co no resuelve); paleta reemplazada en todo el sitio (0 restos); Poppins solo marca/tagline; assets en `assets/brand/`; codemod sobre 122 HTML; backend `api/*.js` con `BASE`/`FROM_EMAIL`/niveles LATAWEL. PRESERVADOS: `window.ExploraCO`, token, style id, `.html`, `/api/*`, esquema DB, `exploraco.vercel.app`. **0 endpoints nuevos; 0 migraciones.** Verificacion: `npm test` 896 PASS / 0 FAIL (exit 0); `node --check` 24 archivos; 0 regresiones de divs en 123 HTML; 154 archivos modificados. Bug: **BUG-093** (manifest). Pendientes: config de `SITE_BASE_URL` en Vercel, re-scrape de OG, GSC con sitemap nuevo, reemplazo por SVG maestro. Detalle en TASKS.md TSK-164.
- **CERRADA / EN WORKING TREE (2026-09-29; commit/deploy PENDIENTE):** **TSK-161 / ADR-071 / BUG-091 - Mapa base CARTO -> OSM + cadena de respaldo de 3 proveedores (`osm` -> `osm-hot` -> `esri-imagery`).** Causa raiz: CARTO sirve HTTP 200 con un PNG placeholder "API KEY REQUIRED" y el fallback por `tileerror` nunca se disparaba. Archivos: `mapa-tiles.js` (L21-25), `mapa-cultural.js` (L71/L73), `index.html` (L1732/1734/1741/2291), `mapas.html` (L301/303-306), `comunidad.html` (L2043-2052). Verificacion: `npm test` EXIT 0 (13 smokes); `smoke_mapa_tiles.js` 24/24; `smoke_mapa_cultural.js` 98/98; Escudo GOLD APROBADO. Deuda: id legado `carto-voyager` (`mapa-cultural.js:359`, `mymapa.js:152`); hallazgo ADR-006 en `map-picker.js:91` (pasa CARTO como `custom` primero); ~90 `.html` estaticos con `cartocdn` inline fuera de alcance. Detalle en TASKS.md TSK-161.
- **CERRADA (2026-09-29; requiere REINICIAR OpenCode):** **TSK-162 / BUG-092 / BUG-CONFIG-5 - Fix del modelo de subagentes (free tier de `opencode`).** Sintoma: todo subagente fallaba con "OpenCode's free tier can only be used from within OpenCode". Causa: los 19 agentes de `.opencode/agent/*.md` declaraban `opencode/big-pickle` (free tier NO admite invocacion como subagente) y `opencode.json` tenia `small_model: opencode/big-pickle`. Fix: 18 agentes -> `opencode-go/deepseek-v4.1-flash` + `media-reader-free.md` -> `opencode-go/mimo-v2.6-pro` (vision); `small_model` -> `opencode-go/deepseek-v4-flash`. Detalle en TASKS.md TSK-162.
- **IMPLEMENTADO EN WORKING TREE / ESCUDO GOLD VERDE (2026-09-29; commit/deploy PENDIENTE; express ampliado):** **TSK-160 / ADR-070 - Modulo unificado de subida + subir en la galeria del directorio.** (A) `mi-perfil.html`: la tarjeta `.pf-subida` del tab Perfil pasa a modulo unificado con 3 acciones (`subidaAbrir('perfil'|'museo'|'lugar')`) y el modal `#modal-museo-recurso` gana el selector `#museo-f-publicar` + campo destino (`museo-f-destino-*`); `museoModoPublicacion()` alterna campos; `museoGuardar()` enruta perfil -> `pfFotoSubirUrl()` y lugar -> `museo_recurso` con `destino_id`; el buscador de destinos se generaliza a `buscarDestinoEn`/`elegirDestinoEn` (wrappers `buscarDestinoAlbum`/`elegirDestinoAlbum` + `buscarDestinoMuseo`); se retira `#btn-museo-subir` (la grilla de gestion queda en el tab Museo). (B) `api/interacciones.js`: `museo_recurso` crear persiste `album_fotos.destino_id` (fallback 42703); GET `museo_recurso` expone `destino_id` (select con fallback 42703); `galeria_destino` incluye fotos etiquetadas por `af.destino_id` ademas de la cercania por coords (fallback 42703). (C) `galeria.html` (modo `?destino=slug`): la seccion "Comparte tu foto" permite subir archivo via `media-upload.js` (contexto `destino`) ademas del link (`gShareArchivo`/`gShareArchivoElegido`, `gShareFoto(urlOverride)`). Verificacion: `node scripts/express_check.js mi-perfil.html galeria.html api/interacciones.js` PASS 4/4 (divs 593/593 y 85/85, sintaxis + ASCII interacciones); JS inline de ambos HTML compila (`new Function`); smokes `smoke_042` 28/28, `smoke_036` 93/93, `smoke_032` 45/45. **8/8 endpoints intacto**; sin migraciones nuevas (usa `album_fotos.destino_id` de la 042). Deuda `[DEUDA-EXPRESS]`: `editar` de `museo_recurso` no acepta `destino_id`; la grilla del Museo no muestra la etiqueta; subida de galeria solo imagen; QA runtime pendiente. **[NOTA ANULADA por TSK-177 (2026-10-04, commit `8315fb0`)]: la retirada de `#btn-museo-subir` queda ANULADA por decision explicita del operador.** La capacidad de subir material se **REINTRODUCE** en "Gestion del Museo" (pestana Museo) con un boton **distinto** y sin `id`, que abre el modal en modo `museo` via `subidaAbrir('museo')`. **El `id` viejo no vuelve**; lo que vuelve es la capacidad. El resto de TSK-160 (selector `#museo-f-publicar`, campo destino, `museoGuardar()`, generalizacion `buscarDestinoEn`/`elegirDestinoEn`) sigue vigente sin cambios. Detalle en TSK-177.
- **IMPLEMENTADO EN WORKING TREE / QA APTO CON OBSERVACIONES (2026-09-24; commit/deploy PENDIENTE):** Pantallas de entrada (TSK-156 / adaptacion de `prompt mensaje.txt`): overlay de bienvenida en `index.html` (`ec_welcome_visto` 1 sola vez, `window.ExploraCO.abrirBienvenida`, z-index 10000) + `registro.html` REDISEÑADO dark dorado (banner con NOMBRE del anfitrion via `ref_info`, selector de premios `#reg-bonos` desde `GET tipo=bonus_referido`, reclamo post-alta `POST reclamar_bonus_referido`, "Continuar sin invitacion" `#reg-skip-ref`) + `api/usuarios.js` v23 (rama publica GET `?tipo=ref_info` suave sin JWT: solo `anfitrion_nombre` trim+slice(0,80), 200 `REFERIDO_INVALIDO`). `api/interacciones.js`: SOLO anotacion (premios del prompt = propuesta FUTURA; se mantiene catalogo `bienvenida_x2_24h`/`bienvenida_ascenso`/`bienvenida_fundador`). ADR-006: 4 archivos del lote + `scripts/smoke_ref_info.js` (NUEVO, untracked, **26/26 PASS**) + `package.json` (M, encadena el smoke al INICIO de `npm test`) SIN commitear. Escudo GOLD: sintaxis 4/4, ASCII 0 en api/*.js y JS nuevo, divs 5/5 y 390/390; smokes `smoke_regalias_bono.js` 63/63 + `smoke_016_multinivel_crowdsourcing.js` 52/52 + `smoke_ref_info.js` 26/26. **8/8 INTACTO**; sin migraciones; sin ADR nuevo (nota de producto en DECISIONS.md). Deuda etiquetada: IDOR preexistente en `reclamar_bonus_referido` (codigo 036, escalado a `sql-security`).
- **IMPLEMENTADO EN WORKING TREE / AUDITADO APTO PARA DEPLOY (2026-09-24; commit/deploy PENDIENTE):** Multiplicador de Origen por lejania (ADR-058 / TSK-155): el XP por acciones fisicas crece con la distancia REAL (haversine) al punto de la accion segun tier de origen (Local x1.00; Nomada 1.00 + 0.20*min(km/1000,1) top 1.20; Extranjero 1.20 + 0.20*min(km/3000,1) top 1.40); `mult_origen` como HERMANO de `stack_temp` dentro de `calcularXpFinal`; ELIMINA el bono plano x1.2 del ADR-028 (WP-5), el Arbol de Clases usa el MISMO factor escalonado (v30). Migracion NUEVA **038** (geo_ciudades 1.122 / geo_paises 245 / `usuarios.origen_declarado_en` + backfill / `xp_ledger.mult_origen`+`origen_tier` / 7 claves de config) **APLICADA en Neon el 2026-09-24** + seed `scripts/seed_geo.js` cargado. Archivos: `api/interacciones.js` v29/v30, `api/usuarios.js` v22 (objeto `origen` + anti-teleport), `api/admin.js` v6 (`salud_red` 4 bloques de origen), `index.html`/`usuario-session.js` (badge origen), `mi-perfil.html` ("Tu origen"). Smokes: `smoke_058_origen_clasificador` 90/90 (en `npm test`) + `smoke_origen_factor_parity` 111/111 (Neon, gate `npm run smoke:origen`). **8/8 INTACTO**. Cierra hallazgo G-1 de gobernanza (drift documental). Deuda `[DEUDA]`: cap_global puede absorber el premio; curva duplicada JS/SQL (parity = red); nerf M-4 x1.2->1.00 sin ciudad_base; sin verificacion documental; seed geo sin auto-update.
- **IMPLEMENTADO EN WORKING TREE (2026-09-23; migracion 034 PENDIENTE de aplicar en Neon + deploy pendiente):** Mercado de Emprendedores (ADR-055 / TSK-151): 3 mercados INDEPENDIENTES por Casa con normas propias (`mercado_config`; condor 2%/25%, jaguar 5%/10%, delfin 0%/5%), habilidad global "Emprendedor" sobre `usuarios.mercado_puntos` (METRICA DE PROGRESO, NO moneda; no viola ADR-018), compra atomica por CTEs con `23514`->409, produccion de consumibles y admin `?recurso=mercado`. Archivos: `api/interacciones.js` v28, `api/usuarios.js` v21, `api/admin.js` v5, `mercado.js` (NUEVO), tab Mercado en `comunidad.html`, card Emprendedor en `mi-perfil.html`, pantalla Mercado en `admin.html`, `db/migrations/034_mercado_emprendedores.sql` (NUEVA), `scripts/smoke_mercado.js` (NUEVO, en `npm test`). `npm test` VERDE + `smoke_mercado` 38/38 (gate doble de nivel verificado: nodo efectivo = `min(puntos, nivel)`); Escudo GOLD verde; **8/8 INTACTO**. BUG-083 CERRADO. Deuda `[DEUDA-EXPRESS]`: validar `mercado_mi` con sesion real en Neon; contrato de oferta/demanda con datos reales; `mercado_puntos` sin ledger por evento.
- **IMPLEMENTADO EN WORKING TREE (2026-09-22, sesion express; commit/deploy pendiente; v27 CORREGIDA el 2026-10-02 al cerrar ADR-079):** v27 "Rising Star Decay" del voto de media — **el decay se CONSERVA integro** (XP decreciente con carga ponderada que se recarga a full a las 24h; sigue fijando el VALOR del voto, con su curva actual sin recalibrar) pero **el cooldown creciente `min(600, carga*30)` s queda DEROGADO por ADR-079**: borradas `VOTO_COOLDOWN_FACTOR` y `VOTO_COOLDOWN_MAX_SEG` (~`:277-281`), retirado `MAX(creado_en) AS ult` de la consulta de carga (`:4953-4956`; se conservan `n` y `carga`), borrados el calculo y la rama de bloqueo (~`:4967`) y el 429 "Espera Ns" de `registrarVotoMedia` (~`:5055`); `api/interacciones.js` 14468 -> 14454 lineas. **El voto siempre se permite en servidor**; el 429 de `tope` (limite diario 20/24h) queda INTACTO. **Cierra BUG-099** (voto que no persistia y habia que refrescar, por un cooldown bloqueante invisible). Ademas: recalibracion de `XP_BASES` + galeria unificada desde la ficha (deep-link `#g-foto`, se elimina el lightbox `#lb`). Archivos: `api/interacciones.js` (`XP_BASES` + `aplicarMediaVoto` + `registrarVotoMedia`), `api/pagina-destino.js` (elimina `#lb`, navega a `/galeria.html?destino=<slug>#g-foto=<url>`), `galeria.html` (`gAutoAbrirHash`), `scripts/check_buildHTML_inline.js` (guard), `scripts/smoke_036_media_unificada.js` (`:136,164,174,220`, 4 matchers de regex realineados: identifican consultas por SQL literal y el borrado de `AS ult` los desalineo -> **93/93**, `npm test` VERDE). Verificacion: `node --check` OK en ambos ficheros; ASCII-safety 0 bytes > 127. Deuda `[DEUDA-EXPRESS]`: la deuda "ADR nuevo que revierta ADR-053 (Decay)" queda **CERRADA** (ADR-079 escrito en `DECISIONS.md:4279-4347`); siguen `publicar_lugar` XP sin wiring, espejos locales de XP (`directorio-session.js` + fichas estaticas) y CSS huerfano `#lb`. Deuda abierta nueva: **deriva de calibracion de `XP_BASES.voto_media`** (5 documentado en `DECISIONS.md:2912` vs 3 real en `api/interacciones.js:474`) — registrada, NO resuelta, en `BUGS_HISTORICOS.md` > "Deuda ADR-079".
- **PENDIENTE:** TSK-016 (Widget "Quien va este mes"), TASK-004 (dominio exploraco.co), TASK-005 (Search Console + sitemap), TASK-006 (RESEND_API_KEY), TASK-009 (pagos Wompi/PSE), TASK-010 (WhatsApp al aprobar lugar), TASK-013 (asignar autor al post de blog), TASK-014 (push de la sesion blog/multi-tema), TSK-135 (QA visual del mapa cultural migrado).
- **DEUDA / PENDIENTE (2026-09-28; SOLO gobernanza de orquestacion, NO toca `api/*`):** orquestacion ADR-067 (TSK-157): (a) verificar R3 en runtime (reiniciar opencode + `webfetch` desde un subagente; BUG-CONFIG-2 / BUG-086); (b) versionar `docs/orquestacion/REFERENCIA-RUTEO.md` (untracked); (c) revisar `explore-free` (`edit: deny` / `bash: deny`); (d) residual de ruta en `scripts/informes-cuota/cuota-2026-09-11-desde-2026-09-06.md:199` (cita `scripts/informe-cuota.js`); (e) `.agents/skills/brainstorming/SKILL.md` (fuera de `.opencode/`) con `description` en ingles; (f) `.opencode/skills/batch-create/SKILL.md` con nombre de modelo; (g) URLs 800px/1200px rotas (HTTP 400; BUG-CONFIG-3 / BUG-087) sembradas en HTML/JS. Detalle en la seccion "Prioridad ORQUESTACION / ADR-067".
- **IMPLEMENTADO EN WORKING TREE (deploy pendiente segun el archivo):** TSK-112 (Casas/Clases), TSK-114..TSK-123 (Museo URL-only, acordeon, map-picker, Casas/Canales, zonas/marcas, Comunidad > Audiovisual), TSK-130 (starvation de multimedia_mapa), TSK-131 (votos de viajero en la ficha), TSK-143 (drawer del mapa cultural solo por vinculo explicito; ENMIENDA 1 del ADR-047), TSK-144 (estado persistente del usuario en directorios + ficha), TSK-145 (campo zona, migracion 028), TSK-146 (render de media del mapa cultural + diagnostico Neon; BUG-080), TSK-147 (ubicacion por recurso de album + carpetas de guardados + fix de seguridad `scope=mio`; ADR-051/ADR-052, migraciones 029/030 APLICADAS en Neon) y TSK-148 (Gamificacion v6 / ADR-053: `M_nivel` x1.0-x3.0 con doble cap 5.0/10.0, 20 umbrales techo 42000, `xp_ledger`, `gamificacion_config`, `usuarios.nivel_max`, repricing y `?recurso=salud_red`; migracion 031 APLICADA en Neon; backend+smokes COMMITEADOS en `9efbfc7`, frontend/8 espejos en working tree). Verificar commit/deploy real contra el archivo real (ADR-006).
- **DESPLEGADO (2026-09-21, push a `origin/main`):** TSK-149 (guardados de media en "Mis Albumes" / ADR-054: migracion 032 APLICADA en Neon el 2026-09-21 (idempotencia verificada por segunda corrida) + `api/interacciones.js` v26 + `api/pagina-destino.js` fix BUG-082 + frontend + smokes; commit `b4ad861` = HEAD = `origin/main`). Pendiente solo **QA runtime en produccion**.
- **DESPLEGADO (2026-09-23, push a `origin/main`):** TSK-154 - cierre del Museo publico: **BUG-060 CERRADO** (migracion 004 APLICADA en Neon con `node scripts/apply_004_foto_url.js`) y **BUG-084 NUEVO CERRADO** (fallback con `AS` duplicado -> `avatar_url AS foto_url AS foto_url` -> SQLSTATE 42601 -> HTTP 500 en `?tipo=museo_publico`, incluso para UUID inexistentes; fix `['foto_url','avatar_url']` en commit `1302f7c`, pusheado a `origin/main`). Verificacion en vivo: **200** con UUID real / **404** con UUID inexistente; Escudo GOLD PASS; smoke `017` 67/73 IDENTICO al baseline. **8/8 INTACTO**; sin ADR nuevo. Deuda: `perfil.html:979` fetch sin JWT; BUG-061 sigue ABIERTO.
- **PENDIENTE DE APROBACION del operador:** TSK-140 (documento de analisis AI-DOS v1.1 / Reglas de Oro v5; archivo COMPLETADO en disco).
- **BLOQUEADA (historica, archivada):** TSK-044 (blog multi-tema); su bloqueo de deploy (TASK-011) figura COMPLETADA, revisar si aplica cierre.

### Indice de secciones

- [Prioridad CRITICA - Ciudad Perdida](#prioridad-critica---fase-de-paridad-ciudad-perdida-y-refactorizacion-backend)
- [Prioridad ALTA - Categorias pendientes](#prioridad-alta---categoru00edas-pendientes-sprint-actual)
- [Prioridad SOCIAL - Backlog Social](#prioridad-social---backlog-social)
- [Prioridad SOCIAL - Logros y trofeos](#prioridad-social---logros-y-trofeos-sprint-actual)
- [Prioridad MEDIA/BAJA - Infraestructura y Backlog](#prioridad-mediabaja---infraestructura-y-backlog)
- [Prioridad SESION EXPRESS 2026-09-18/19](#prioridad-sesion-express-2026-09-1819---modo-express-skill-express-mode)
- [Prioridad MAPA CULTURAL COMPARTIDO 2026-09-19 (ADR-045)](#prioridad-mapa-cultural-compartido---2026-09-19-adr-045)
- [Prioridad GALERIA / MAPA / MIS MAPAS / MEDIA 2026-09-19 (ADR-046 + ADR-047)](#prioridad-galeria--mapa-cultural--mis-mapas--media---2026-09-19-adr-046--adr-047)
- [Prioridad GEMA GEMINI RESEARCH - 2026-09-20 (cierre express)](#prioridad-gema-gemini-research---2026-09-20-cierre-express)
- [Prioridad AGENTES HYBRID - 2026-09-20 (ADR-048)](#prioridad-agentes-hybrid---2026-09-20-adr-048)
- [Prioridad SALTO DEL TEQUENDAMA - 2026-09-20 (cierre express)](#prioridad-salto-del-tequendama---2026-09-20-cierre-express)
- [Prioridad DRAWER MAPA CULTURAL - 2026-09-20 (cierre express / ENMIENDA 1 ADR-047)](#prioridad-drawer-mapa-cultural---2026-09-20-cierre-express--enmienda-1-adr-047)
- [Prioridad ESTADO PERSISTENTE DEL USUARIO - 2026-09-20 (cierre express)](#prioridad-estado-persistente-del-usuario-directorios--ficha--resena-con-nombre---2026-09-20-cierre-express)
- [Prioridad CAMPO ZONA (region natural) - 2026-09-20 (cierre express)](#prioridad-campo-zona-region-natural-en-el-admin-general---2026-09-20-cierre-express)
- [Prioridad FIX DE VOTOS DE FOTOS CURADAS (BUG-079) - 2026-09-20 (cierre express)](#prioridad-fix-de-votos-de-fotos-curadas-bug-079---2026-09-20-cierre-express)
- [Prioridad FIX DE RENDER DE MEDIA DEL MAPA CULTURAL + DIAGNOSTICO NEON - 2026-09-21 (BUG-080 / TSK-146)](#prioridad-fix-de-render-de-media-del-mapa-cultural--diagnostico-neon---2026-09-21-bug-080--tsk-146)
- [Prioridad UBICACION POR RECURSO + CARPETAS DE GUARDADOS + FIX DE SEGURIDAD DEL MAPA - 2026-09-21 (ADR-051 / ADR-052 / BUG-081 / TSK-147)](#prioridad-ubicacion-por-recurso--carpetas-de-guardados--fix-de-seguridad-del-mapa---2026-09-21-adr-051--adr-052--bug-081--tsk-147)
- [Prioridad GAMIFICACION v6 / ADR-053 - 2026-09-21 (TSK-148)](#prioridad-gamificacion-v6--adr-053---2026-09-21-tsk-148)
- [Prioridad GUARDADOS DE MEDIA EN "MIS ALBUMES" - 2026-09-21 (ADR-054 / BUG-082 / TSK-149)](#prioridad-guardados-de-media-en-mis-albumes---2026-09-21-adr-054--bug-082--tsk-149)
- [Prioridad EL TALLER DE LAS MOSCAS - 2026-09-21/22 (cierre express)](#prioridad-el-taller-de-las-moscas---cierre-express-2026-09-2122)
- [Prioridad MERCADO DE EMPRENDEDORES - 2026-09-23 (ADR-055 / TSK-151)](#prioridad-mercado-de-emprendedores---2026-09-23-adr-055--tsk-151)
- [Prioridad MUSEO PUBLICO (BUG-060 + BUG-084) - 2026-09-23 (TSK-154)](#prioridad-museo-publico-bug-060--bug-084---2026-09-23-tsk-154)
- [Prioridad MULTIPLICADOR DE ORIGEN POR LEJANIA - 2026-09-24 (ADR-058 / TSK-155)](#prioridad-multiplicador-de-origen-por-lejania---2026-09-24-adr-058--tsk-155)
- [Prioridad PANTALLAS DE ENTRADA - 2026-09-24 (TSK-156)](#prioridad-pantallas-de-entrada---2026-09-24-tsk-156)
- [Prioridad ORQUESTACION / ADR-067 - 2026-09-28 (deuda post tanda de coste)](#prioridad-orquestacion--adr-067---2026-09-28-deuda-post-tanda-de-coste)
- [Prioridad RESTAURACION DE LA CAPA GRATUITA - 2026-09-30 (ADR-074 / TSK-165)](#restauracion-de-la-capa-gratuita-de-agentes---2026-09-30-adr-074--tsk-165)
- [Prioridad CONTROL DE PANTALLA COMPLETA + HOME - 2026-09-30 (ADR-075 / TSK-169)](#control-de-pantalla-completa-de-mapas--limpieza-y-reorden-del-home---2026-09-30-tsk-169)
- [Prioridad ROSTER UNICO DE AGENTES + AGENTS.md - 2026-10-01 (ADR-076 / TSK-170)](#roster-unico-de-20-agentes--agentsmd---2026-10-01-adr-076--tsk-170)
- [Prioridad PERMISOS TOTALES + ECONOMIA DE TURNOS + SMOKE PERMANENTE - 2026-10-02 (ADR-078 / TSK-172)](#prioridad-permisos-totales--economia-de-turnos--smoke-permanente-de-grupos---2026-10-02-adr-078--tsk-172)
- [Prioridad INVENTARIO Y PLAN DE LOS 26 FAIL DE EXPRESS_CHECK - 2026-10-02 (TSK-173)](#inventario-y-plan-de-saneado-de-los-26-fail-de-express_checkjs---2026-10-02-tsk-173)
- [Prioridad SANEADO DE UI DEL PERFIL Y DE COMUNIDAD - 2026-10-02 (TSK-174 / ADR-080 / ADR-081)](#prioridad-saneado-de-ui-del-perfil-y-de-comunidad---2026-10-02-tsk-174--adr-080--adr-081)
- [Prioridad TIER POR MODELO ACTIVO + ATRIBUCION DE COSTE - 2026-10-04 (ADR-083 / TSK-175)](#prioridad-tier-por-modelo-activo--atribucion-de-coste---2026-10-04-adr-083--tsk-175)
- [Misiones desplegables por estado + galeria de perfil en el modal + "Subir material" en Gestion del Museo - 2026-10-04 (TSK-177 / ADR-077 ENMIENDA 1)](#misiones-desplegables-por-estado--galeria-de-perfil-en-el-modal--subir-material-en-gestion-del-museo---2026-10-04-tsk-177--adr-077-enmienda-1)
- [Realineacion del hero y del posicionamiento de la HOME - 2026-10-04 (TSK-176)](#realineacion-del-hero-y-del-posicionamiento-de-la-home---2026-10-04-tsk-176)
- [Regla de actualizacion](#regla-de-actualizacion)
- [Historico de paginas dinamicas (TSK-018..TSK-065) - ver TASKS_ARCHIVO.md](TASKS_ARCHIVO.md)

## Leyenda de estado
- **PENDIENTE:** no iniciada[cite: 1].
- **EN PROGRESO:** iniciada, sin cerrar[cite: 1].
- **BLOQUEADA:** requiere una dependencia previa[cite: 1].
- **COMPLETADA:** cerrada e integrada[cite: 1].

---

## Historico de paginas dinamicas (TSK-018..TSK-065)

> Movido a TASKS_ARCHIVO.md (contenido completo, Cero Borrado Logico).

## Prioridad CRITICA - Fase de Paridad "Ciudad Perdida" y Refactorizacion Backend

> Nota de cierre (Sprint 2 - Paridad Visual, ver DECISIONS.md ADR-006): las
> tareas TSK-011 a TSK-014 tal como estaban descritas no correspondian al
> codigo real (ej. TSK-014 pedia fijar admin.html en 4.817 lineas exactas,
> pero el archivo real ya tenia 5.082 antes de esta entrega). Se cierran
> con el alcance realmente verificado y ejecutado; ver detalle abajo.

### TASK-000: Sincronizar admin-destinos.js a v2 REAL
- **Estado:** COMPLETADA (verificado, no requirio cambios)
- **Nota de cierre:** admin-destinos.js v2.1 ya implementa el MERGE JSONB (`tags = COALESCE(tags,'{}') || $N::jsonb`, ver linea ~247 de admin-destinos.js). No se toco en este sprint porque los campos nuevos (dificultad_desc, dificultad_tags, temporada_matriz, tipo_tour/idioma/max_personas) viven dentro del mismo campo `tags` generico -- el merge existente ya los persiste sin cambios de backend.

### TSK-013: Hero e impacto visual (Multimedia) -- Sprint 2
- **Estado:** COMPLETADA
- **Detalle:** Fix del bug que dejaba `heroThumbs` siempre vacio (doble declaracion, ver BUGS_HISTORICOS.md BUG-011). Enriquecido `hqi` con Duracion, Horario y fallback de rating "4.8 - Nuevo". Ajustado `.htitle` a `clamp(40px,6vw,72px)`. Eliminado codigo muerto `heroBtns`.
- **Evidencia:** pagina-destino.js, bloque HQI (buscar "BUG-011 fix").

### TSK-014: Dificultad (Industrial Premium) -- Sprint 2
- **Estado:** COMPLETADA
- **Detalle:** Nuevos campos `tags.dificultad_desc` y `tags.dificultad_tags` (aptitudes/restricciones) en admin.html (`especifico-sitio > Dificultad`) y en pagina-destino.js (`.diffcard`, bordes rectos, sombra dura `5px var(--gold)`). Fix del bug donde el valor "Experto" del select no matcheaba la clave "extremo" del renderer (ver BUGS_HISTORICOS.md BUG-013).
- **Evidencia:** admin.html `#dificultad-tags-admin` + `f-dificultad-desc`; pagina-destino.js `.diffcard`.

### TSK-015: Temporada (matriz de 12 meses) -- Sprint 2
- **Estado:** COMPLETADA
- **Detalle:** Nuevo campo `tags.temporada_matriz` (objeto Ene..Dic con ideal/posible/evitar), UI de 12 selects en admin.html, render en matriz con leyenda en pagina-destino.js. El campo legado `tags.temporada` (rangos de texto) se conserva como fallback y en un `<details>` de compatibilidad en el admin (Cero Borrado Logico, Reglas de Oro punto 3).
- **Evidencia:** admin.html `f-temporada-ene`..`f-temporada-dic`; pagina-destino.js `.tmgrid`.

### TSK-016: Tours 4.0 -- Sprint 2
- **Estado:** COMPLETADA
- **Detalle:** Nuevos campos `tipo_tour`, `idioma`, `max_personas` por tour (genericos via `[data-field]`, sin cambios en `collectTourItems()`). Motor de tarjeta propio `.tcard` (abandona `.icard`). Fix critico: el renderer leia `t.link`/`t.desc`, pero admin.html guarda `t.link_reserva`/`t.descripcion` -- el boton "Reservar ahora" y la descripcion nunca se mostraban en produccion (ver BUGS_HISTORICOS.md BUG-012).
- **Evidencia:** pagina-destino.js `.tcard`; admin.html `_tourRowHTML()`.

### TSK-011 / TSK-012 (Supabase Storage, persistencia por data-field generica)
- **Estado:** NO APLICABLE a este sprint
- **Nota:** El proyecto ya usa Neon + fotos via URL directa (no Supabase Storage) y `collectTourItems()` ya usaba el patron `[data-field]` antes de este sprint. Si estas tareas se referian a otra cosa, se necesita detalle adicional de Javier -- no se invento alcance para cerrarlas.



---

## Prioridad ALTA - Categor\u00edas pendientes (Sprint Actual)

### TASK-001: Implementar categoria Hostal
- **Prioridad:** ALTA
- **Responsable:** Lead Developer[cite: 1]
- **Estado:** COMPLETADA
- **Dependencia:** Ninguna (habitaciones/amenidades/faqs ya existen en `destinos_detalles`)[cite: 1]
- **Sprint:** Sprint 2 (Primer modulo funcional)[cite: 1]
- **Nota de cierre:** el admin de Hostal NO estaba vacio como decia este ticket -- ya tenia 6 sub-tabs (Habitaciones, Servicios, Reservas, Como llegar, Eventos, FAQs) con inputs reales (ver DECISIONS.md ADR-006). Se agrego la 7a sub-pestana "Politicas" con los 6 campos pedidos (tipo_alojamiento, reglas_casa, edad_minima, mascotas, cocina_compartida + politica_cancelacion reutilizando un input existente), registrados en el motor generico `CATEGORY_TAG_FIELDS.hostal` / `CATEGORY_TAG_LISTS.hostal` (TSK-012) en vez de editar `collectPlace()`/`_placeToAPI()`/`loadForm()` a mano. De paso se corrigieron 4 fallas activas encontradas en el camino (ver BUGS_HISTORICOS.md BUG-016): datos de habitaciones/eventos desalineados por funciones duplicadas, 5 campos que nunca llegaban a la API, y 2 que llegaban pero el backend los descartaba.
- **Detalle tecnico:** Sub-tabs en admin.html dentro de `especifico-hostal`[cite: 1]. Campos tags: tipo_actividad -> tipo_alojamiento, reglas_casa, actividades, que_incluye, politica_cancelacion[cite: 1], mas edad_minima/mascotas/cocina_compartida (ya anticipados en BLUEPRINT.md seccion 4 y en el TODO del propio codigo). Secciones nuevas en pagina-destino.js: Reglas de la casa, Actividades disponibles (+ Que incluye), Como llegar, Eventos del hostal -- las 2 ultimas porque BUG-C dejaba esos datos sin ningun lugar donde persistirse ni mostrarse. Balance de divs verificado (0), `node --check` limpio.
- **Evidencia fisica de exito:** Formulario de Hostal renderizado en el front-end y datos insertados sin desbordamientos en el DOM. Smoke test de `buildHTML()` con datos mock de hostal confirma render correcto de las 4 secciones nuevas y degradacion condicional (0 secciones fantasma) cuando no hay datos.

### TASK-002: Implementar categor\u00eda Comida
- **Prioridad:** ALTA
- **Responsable:** Lead Developer[cite: 1]
- **Estado:** COMPLETADA
- **Dependencia:** TASK-001 (completada, patron ya validado)[cite: 1]
- **Sprint:** Sprint 4
- **Nota de cierre:** igual que con Hostal (ADR-006), el admin de Comida
  NO estaba vacio como decia este ticket -- ya tenia 3 sub-tabs (Carta/
  Menu, Horarios, Delivery) con inputs reales, pero ninguno de sus datos
  llegaba a Neon: `CATEGORY_TAG_FIELDS.comida`/`CATEGORY_TAG_LISTS.comida`
  (TSK-012) estaban vacios ([]), y `collectMenuItems()`/
  `collectHorariosDias()` estaban duplicadas y rotas (ver BUGS_HISTORICOS.md
  BUG-018). Se agrego la 4a sub-pestana "Perfil" (tipo_comida, cocina,
  precio_promedio, ambiente, terraza, reservas, opciones dieteticas) y se
  conectaron los 3 tabs existentes al motor generico
  `CATEGORY_TAG_FIELDS.comida`/`CATEGORY_TAG_LISTS.comida`, en vez de tocar
  `collectPlace()`/`_placeToAPI()`/`loadForm()` a mano (igual criterio que
  TASK-001). `horario_detallado` se trato como objeto {dia:{abre,cierra,
  estado}} (no arreglo), con el mismo tratamiento especial que
  `temporada_matriz` de Sitio en `_buildTagsObj()`/`_applyTagsToLocal()`.
  Se agrego ademas una lista generica de "otras plataformas de domicilio"
  (mas alla de Rappi/iFood, que ya existian pero nunca se guardaban) por
  decision explicita del Project Manager al validar el alcance.
  De paso se encontro y corrigio un bug critico no documentado en
  `loadForm()`: el precarga de Sitio y Evento estaba anidado (y por lo
  tanto muerto) dentro de `if(p.cat==='hostal')` desde TASK-001 -- ver
  BUGS_HISTORICOS.md BUG-017. `admin-destinos.js` no requirio cambios: el
  MERGE JSONB ya existente (ADR-003) cubre `tags.menu_destacado`,
  `tags.opciones_dieta`, `tags.horario_detallado`, etc. sin tocar el
  backend (mismo razonamiento que TASK-000/Sprint 2).
- **Detalle tecnico:** Sub-tabs en admin.html dentro de `especifico-comida`
  (Carta/Menu, Horarios, Delivery, Perfil). Campos tags: tipo_comida,
  cocina, precio_promedio, ambiente, terraza, reservas, domicilio, rappi,
  ifood, domicilio_zona, menu_destacado[] (nombre/precio/foto/badge),
  opciones_dieta[] (checkboxes), domicilio_plataformas[],
  horario_detallado{}. Secciones nuevas en pagina-destino.js: Cocina y
  ambiente, Menu destacado, Horarios, Opciones dieteticas y domicilio --
  las 4 condicionales (no se renderizan si `tags` no tiene datos para esa
  seccion). Balance de divs de `especifico-comida` verificado (0),
  `node --check` limpio en admin.html y en pagina-destino.js, ASCII-safety
  de pagina-destino.js verificada (0 bytes no-ASCII, 0 backticks, 0 doble
  escape).
- **Evidencia fisica de exito:** Smoke test de `buildHTML()` con datos mock
  de comida (ver script de verificacion) confirma render correcto de las 4
  secciones nuevas, degradacion condicional (0 secciones fantasma) cuando
  `tags` esta vacio, y que un dia marcado "Cerrado" se muestra aunque no
  tenga horas cargadas. Tambien se verifico con datos mock de categoria
  `sitio` que el fix de BUG-017 no rompe su propio precarga.

### TASK-003: Implementar categor\u00eda Evento
- **Prioridad:** ALTA
- **Responsable:** Lead Developer[cite: 1]
- **Estado:** COMPLETADO (Sprint 5)
- **Dependencia:** TASK-001, TASK-002 (mismo patr\u00f3n ya validado dos veces)[cite: 1]
- **Sprint:** Sprint 5 (Integracion)
- **Detalle t\u00e9cnico:** Sub-tabs en `admin.html` dentro de `especifico-evento`: Fechas y sede, Lineup/Artistas, Agenda, y 2 sub-tabs nuevos (Tipos de entrada, Qu\u00e9 llevar). Campos tags: fecha_inicio, fecha_fin, edicion, sede, lineup[], agenda[], categorias_entrada[], que_llevar[], prohibido[] -- registrados en el motor gen\u00e9rico `CATEGORY_TAG_FIELDS.evento`/`CATEGORY_TAG_LISTS.evento` (TSK-012), no editados a mano. "capacidad" y "entrada desde" NO se duplicaron dentro de tags: se eliminaron los inputs `f-aforo`/`f-entrada-desde` (nunca conectados a nada) y se reusan los campos gen\u00e9ricos ya existentes `f-capacidad` (columna `destinos.capacidad`) y `f-price` (columna `destinos.precio_desde`), mismo patr\u00f3n de no-duplicaci\u00f3n que TASK-001 aplic\u00f3 con `politica_cancelacion`. Secciones nuevas en `pagina-destino.js`: Fecha y sede, Lineup/Artistas, Agenda del evento, Tipos de entrada, Qu\u00e9 llevar (con checklist + prohibiciones) -- las 5 condicionales, con fechas formateadas ("5 de Diciembre de 2026") vía un helper nuevo (`fmtFechaEvento()`). `admin-destinos.js` no requiri\u00f3 cambios (mismo razonamiento que Sitio/Hostal/Comida: el MERGE JSONB ya cubre los campos nuevos, ADR-003).
- **Nota de cierre:** al verificar el archivo real (ADR-006) se confirm\u00f3 que el admin de Evento tampoco estaba vac\u00edo como dec\u00eda este ticket -- ya ten\u00eda 3 sub-tabs (Fechas y sede, Lineup, Agenda) con inputs reales, pero con **6 fallas activas nunca reportadas** (ver BUGS_HISTORICOS.md BUG-019): (1) `CATEGORY_TAG_FIELDS.evento`/`CATEGORY_TAG_LISTS.evento` estaban vac\u00edos, as\u00ed que absolutamente nada de lo que se escrib\u00eda en la pesta\u00f1a Evento llegaba a Neon; (2) los botones "+ A\u00f1adir artista"/"+ A\u00f1adir actividad" llamaban a `addLineupRow()`/`addAgendaRow()`, funciones que no exist\u00edan en el archivo; (3) `collectLineupItems()`/`collectAgendaItems()` estaban declaradas dos veces (mismo patr\u00f3n que BUG-006/BUG-018); (4) exist\u00eda c\u00f3digo huerfano (`addLineupItem()`/`addEntradaItem()` apuntando a contenedores `#lineup-admin`/`#entradas-admin` que no exist\u00edan en el DOM actual); (5) `loadForm()` precargaba el Lineup al editar un evento pero nunca la Agenda; (6) los campos "Entrada desde"/"Aforo" duplicaban `f-price`/`f-capacidad` (gen\u00e9ricos, ya usados por las 4 categor\u00edas) sin conectarse a ning\u00fan lado. Se corrigieron las 6 durante esta entrega, se reconect\u00f3 `addEntradaItem()` (antes hu\u00e9rfano) como base del nuevo sub-tab "Tipos de entrada", y se agregaron collectors nuevos para `categorias_entrada`, `que_llevar` y `prohibido`.
- **Evidencia f\u00edsica de \u00e9xito:** Smoke test de `buildHTML()` con datos mock de evento (ver script de verificaci\u00f3n) confirma que la agenda se despliega de manera secuencial, las fechas se formatean correctamente ("5 de Diciembre de 2026"), los tipos de entrada "Agotado" se marcan en rojo, y que un evento sin tags cargados no genera ninguna de las 5 secciones nuevas (0 secciones fantasma). Tambi\u00e9n se verific\u00f3 que un destino de categor\u00eda Sitio sigue renderizando sin error (regresi\u00f3n). Balance de divs de `especifico-evento` verificado (0), `node --check` limpio en `admin.html` (script inline extra\u00eddo) y en `pagina-destino.js`, ASCII-safety de `pagina-destino.js` verificada (0 bytes no-ASCII, 0 backticks, 0 doble escape).

---

## Prioridad SOCIAL - Backlog Social

### TSK-015: M\u00f3dulos de puntuaci\u00f3n din\u00e1mica (Quick-Rating)
- **Prioridad:** SOCIAL
- **Responsable:** Lead Developer
- **Estado:** COMPLETADO (Agosto 2026)
- **Dependencia:** TASK-001, TASK-002, TASK-003
- **Sprint:** Sprint 4
- **Detalle t\u00e9cnico:** Voto rapido de 1 a 5 estrellas sin texto en la pagina publica de destino. Backend (`api/interacciones.js`): POST tipo=rating requiere `usuario_id` (400 si falta), dedup simetrico contra resena+rating (409 `ya_votado` + `voto_previo`), +10 XP, `evaluarMisiones()`; nuevo GET tipo=mi_rating para precargar el voto del usuario. `total_resenas` ahora cuenta resena+rating (AVG y COUNT alineados en `interacciones.js` y en el DELETE de `api/admin.js`). Frente (`usuario-session.js`): metodos `window.ExploraCO.votar(DID, rating)` y `obtenerMiVoto(DID)`; sin sesion abre modal de login (NO crea sesion temporal). Renderer (`api/pagina-destino.js`): widget `#qr-stars` dentro de la seccion de resenas, solo si `cat !== 'blog'`, con funciones inline `pintarQR`/`votarDID`/`precargarMiVoto` y guard de presencia de `#qr-stars` (inerte en blogs).
- **Evidencia f\u00edsica de \u00e9xito:** El promedio general del lugar se recalcula al enviar un voto (local en el cliente y en DB), el widget precarga el voto previo del usuario logueado, y el contador "N resenas" incluye votos sin texto. Smoke tests buildHTML: widget presente en 'sitio' (incluye nRes=0), ausente en 'blog', sin IDs duplicados. Escudo GOLD: `node --check` limpio en los 4 archivos, 0 no-ASCII / 0 backticks en los 3 serverless.
- **Decisiones de producto (ver DECISIONS.md ADR-007):** dedup simetrico (quien voto sin texto no puede resenar despues); voto sin sesion -> modal de login; solo el widget nuevo usa \u2605 (el resto de la pagina sigue con asterisco *); la etiqueta sigue siendo "N resenas"; migracion de datos natural (los destinos existentes convergen en el primer POST de cualquiera de los dos tipos).
- **Verificacion en produccion (Agosto 2026):** el flujo completo se probo contra la API de produccion tras corregir un bug de BD que NO estaba en el codigo: un trigger huerfano `trg_xp_on_interaccion`/`fn_actualizar_xp()` rompia los 4 POST de interaccion con 500, y la migracion `activo`/`progreso_misiones` documentada en interacciones.js:9 nunca se habia aplicado (ver BUGS_HISTORICOS.md BUG-021 y DECISIONS.md ADR-008). Post-fix: visita +20 XP + mision, guardado +5 XP con dedup via `activo`, rating +10 XP, resena duplicada 409 `ya_votado`, ausencia del widget en blogs confirmada.

### TSK-016: Widget "Qui\u00e9n va este mes"
- **Prioridad:** SOCIAL
- **Responsable:** Lead Developer
- **Estado:** PENDIENTE
- **Dependencia:** TSK-015
- **Sprint:** Sprint 4
- **Detalle t\u00e9cnico:** Desarrollar componente de UI que extraiga y agrupe avatares de perfiles p\u00fablicos confirmados para un destino espec\u00edfico en el mes en curso.
- **Evidencia f\u00edsica de \u00e9xito:** Avatar miniatura del usuario de prueba es inyectado din\u00e1micamente en el widget de la barra lateral al hacer clic en "Asistir\u00e9".

### TSK-017: Comparador de lugares similares
- **Prioridad:** SOCIAL
- **Responsable:** Lead Developer
- **Estado:** COMPLETADO (Agosto 2026)
- **Dependencia:** TSK-015
- **Sprint:** Sprint 4
- **Detalle t\u00e9cnico:** L\u00f3gica de recomendaci\u00f3n basada en cruce de tags renderizando un carrusel con los top 3 lugares de la misma categor\u00eda ra\u00edz. Implementado 100% en `api/pagina-destino.js` SIN endpoint nuevo (presupuesto Vercel Hobby 8/8 agotado, ver NEXT.md): el handler consulta hermanos `WHERE categoria_slug=$1 AND status='published' AND id<>$2 ORDER BY rating DESC NULLS LAST LIMIT 50` y `topRelacionados()` los rankea por **Jaccard** (interseccion/union) sobre `COMPARADOR_KEYS` por categor\u00eda (sitio: tipo_actividad/dificultad/duracion/temporada; hostal: tipo_alojamiento/reglas_casa/ciudad; comida: tipo_comida/cocina/ambiente/precio_promedio/terraza; evento: sede/edicion/ciudad). Los valores se normalizan (trim + lowercase) y los arrays se expanden. Si hay menos de 3 con overlap, el relleno por rating garantiza la evidencia "compartiendo la categor\u00eda ra\u00edz". Blog excluido del comparador. Render: secci\u00f3n `secRelacionados` "Tambien te puede interesar" tras Contacto (al final de la p\u00e1gina), carrusel horizontal `.rcscroll` con exactamente 3 `.rcard` (foto/emoji con fallback hero_bg, badge de categor\u00eda, nombre, ciudad-region, estrellas + N resenas, enlace `/slug.html`). CSS scoped `.rc*` en el string CSS del renderer (ADR-004).
- **Evidencia f\u00edsica de \u00e9xito:** El scroll horizontal al final de la p\u00e1gina de detalle muestra exactamente 3 cards adicionales compartiendo la categor\u00eda ra\u00edz. Verificado con smoke test de `buildHTML()`/`topRelacionados()` (23/23 PASS: ranking por overlap, relleno por rating, exactamente 3 `.rcard`, 0 secciones fantasma, blog sin comparador, escape de inyecciones en slug/nombre/ciudad, delta de divs del comparador = 0) + `node --check` y ASCII-safety limpios. Verificaci\u00f3n visual en produccion pendiente del deploy.

---

## Prioridad SOCIAL - Logros y trofeos (Sprint Actual)

### TSK-055: Sistema de logros/trofeos estilo consola + coleccion por ciudad (Upland)
- **Prioridad:** ALTA
- **Responsable:** backend-dev + renderer-dev
- **Estado:** COMPLETADO y verificado en prod (2026-08-19; deploy y migracion 005 ya activos, ver TASK-020)
- **Dependencia:** TSK-015 (voto rapido), misiones XP v4, ADR-012
- **Detalle técnico:** Catalogo `LOGROS` estatico en `api/interacciones.js` v5: 16 trofeos con `tier` (bronce/plata/oro/platino), `xp`, `requiere` (DAG) y `check(ctx)` server-side -- 6 de voto/opinion (logr_primer_voto, critico_10, critico_25, opinion_blog, votos_blog_5, votos_blog_10), 5 de conteo (coleccionista_10, coleccionista_50, ciudades_5, visitas_5, visitas_20) y 5 generados de `CIUDADES_COLECCION` (Bogota 12 platino/Alcalde, Cartagena 8 oro, Medellin 8 oro, Santa Marta 6 plata, Cali 6 plata). Progreso en nueva columna `usuarios.progreso_logros jsonb` (migracion `db/migrations/005_usuarios_progreso_logros.sql`, ADR-008), merge `||` segun ADR-003. `evaluarLogros()` se ejecuta en los 4 POST de XP (resena, guardado, visita, rating) con agregados memoizados (1 query por grupo, no por trofeo) y anade `logros` a la respuesta (mantiene `misiones`). GET `tipo=logros&usuario_id=` devuelve catalogo + estado/fecha/tier + rareza global % (Steam, via `jsonb_object_keys`). `api/usuarios.js` deriva `total_logros` (conteo de claves). Nombres de ciudad comparados normalizados (TRANSLATE sin tildes + LOWER) porque Neon convive 'Bogota' y 'Bogotá'. `usuario-session.js`: `sumaLogrosXp`/`mostrarLogrosToast` (toast "Trofeo desbloqueado") en las 4 acciones.
- **Evidencia física de éxito:** `node --check` limpio en interacciones/usuarios/usuario-session; ASCII-safety 0 bytes no-ASCII en los serverless; test local `scripts/test_logros_catalogo.js` 12/12 PASS (16 ids unicos, shape, tiers, DAG a ids validos, todos los check devuelven Promise, TRANSLATE/COALESCE, 5 ciudades, logros de ciudad en catalogo).

### TSK-056: Voto rapido habilitado en blogs + badge de rating en Inspirate/blog.html
- **Prioridad:** ALTA
- **Responsable:** renderer-dev
- **Estado:** COMPLETADO y verificado en prod (2026-08-19; deploy activo, ver TASK-020)
- **Dependencia:** TSK-055, TASK-017/018 (blog), TSK-015
- **Detalle técnico:** Se elimina la supresion `esBlogRes ? '' : '<div id="qrwrap">'` en `api/pagina-destino.js`: el widget `#qr-stars` se renderiza en TODAS las categorias incluida blog, con copy condicional ("Califica este artículo" vs "Califica este lugar") y contador "N opiniones" vs "N resenas" (votos +10 XP, dedup 409, ADR-007). Las tarjetas de Inspirate (`inspFeaturedHTML`/`inspHighlightHTML` en index.html) y las cards de blog.html (`api/utilidades.js` blog-lista, SELECT ahora con `rating`/`total_resenas`) muestran el badge `[estrella] X.Y (N)` cuando hay resenas.
- **Evidencia física de éxito:** Smoke `scripts/smoke_test_blog_voto.js` 14/14 PASS (widget presente en blog y sitio, copy correcto por categoria, contador correcto, sin IDs duplicados, degradacion nRes=0, balance de divs 42/42). `node --check` limpio en pagina-destino.js, utilidades.js e index.html (script inline extraido).

### TASK-020: Aplicar migracion 005 (progreso_logros) + deploy del sistema gaming
- **Prioridad:** ALTA
- **Responsable:** backend-dev (con Javier en Neon)
- **Estado:** COMPLETADA (verificada en prod el 2026-08-19)
- **Dependencia:** TSK-055, TSK-056
- **Nota de cierre:** la migracion `db/migrations/005_usuarios_progreso_logros.sql` YA estaba aplicada en Neon y el sistema gaming (interacciones.js v5) ya estaba desplegado: GET `tipo=logros` con un `usuario_id` real (UUID valido) responde 200 con el catalogo de 16 trofeos y rareza %. El 500 que se habia registrado en sesiones previas era un falso positivo: se habia probado con `usuario_id=test-check`, que no es UUID valido y Postgres lo rechaza con `invalid input syntax for type uuid` (no es un fallo de la columna faltante). Leccion de proceso: verificar logros SIEMPRE con un UUID real de la tabla usuarios, nunca con un id de prueba.
- **Detalle técnico:** Ejecutar en la consola de Neon (ADR-008: SQL versionado, no suelto): `\i db/migrations/005_usuarios_progreso_logros.sql` (ALTER TABLE ADD COLUMN IF NOT EXISTS `progreso_logros jsonb NOT NULL DEFAULT '{}'::jsonb`). Sin esta migracion, GET `tipo=logros` devuelve 500 y los POST degradan (evaluarLogros captura el error y devuelve []). Despues: deploy de Vercel y verificacion en prod (GET logros de un usuario con acciones, voto en un post de blog, badge en Inspirate, toasts de trofeo).
- **Evidencia física de éxito:** Verificado el 2026-08-19 con UUID real `3b78efad-e9f6-49a7-bbd1-af836f528348` (usuario javier): GET `https://exploraco.vercel.app/api/interacciones?tipo=logros&usuario_id=3b78efad-e9f6-49a7-bbd1-af836f528348` = 200 con `total=16`, `desbloqueados=0`, trofeos con `tier`/`rareza_pct`; GET `/api/usuarios?id=...` = 200 con `total_logros=0` y `foto_url`/`ciudad_base` presentes (migracion 004 tambien aplicada).
- **Ampliacion 2026-09-13 (epic prompt.txt, TSK-100/ADR-026):** el perfil como "museo de trofeos" quedo COMPLETO en su version v1 dentro del epic prompt.txt: `mi-perfil.html` estrena museo-line en el hero (trofeos·fotos·destinos con backfill real), galeria de mejoras de perfil (3 consumibles `perfil_*`) y seccion Vocaciones de artista. La vitrina extendida y el sello de verificado quedan como futuro cercano (decision de Javier).

---

## Prioridad MEDIA/BAJA - Infraestructura y Backlog

### TASK-004: Conectar dominio propio exploraco.co en Vercel
- **Prioridad:** MEDIA
- **Responsable:** Project Manager (Javier)[cite: 1]
- **Estado:** PENDIENTE[cite: 1]
- **Dependencia:** Ninguna[cite: 1]
- **Sprint:** Sprint 4 (Optimizacion)[cite: 1]
- **Detalle t\u00e9cnico:** A\u00f1adir y propagar registros DNS del dominio principal en el dashboard de Vercel.
- **Evidencia f\u00edsica de \u00e9xito:** Retorno consistente de c\u00f3digo HTTP 200 al navegar a exploraco.co.

### TASK-005: Configurar Google Search Console y enviar sitemap
- **Prioridad:** MEDIA
- **Responsable:** Project Manager (Javier)[cite: 1]
- **Estado:** PENDIENTE[cite: 1]
- **Dependencia:** TASK-004 (dominio propio activo)[cite: 1]
- **Sprint:** Sprint 4[cite: 1]
- **Detalle t\u00e9cnico:** Generar archivo `sitemap.xml` din\u00e1mico con la ruta de todos los destinos y someterlo a indexaci\u00f3n.
- **Evidencia f\u00edsica de \u00e9xito:** Bandera verde de "Success" en Search Console al leer el sitemap enviado.

### TASK-006: Configurar variable de entorno RESEND_API_KEY en Vercel
- **Prioridad:** MEDIA
- **Responsable:** Project Manager (Javier)[cite: 1]
- **Estado:** PENDIENTE[cite: 1]
- **Dependencia:** Ninguna[cite: 1]
- **Sprint:** Sprint 4[cite: 1]
- **Detalle t\u00e9cnico:** Inyectar la clave API de forma segura en la configuraci\u00f3n de variables de entorno de producci\u00f3n del panel de Vercel.
- **Evidencia f\u00edsica de \u00e9xito:** Ejecuci\u00f3n de script de env\u00edo de correo de prueba exitosa sin arrojar error de autorizaci\u00f3n 401.

### TASK-007: Vaciar arrays hardcodeados PL[] y MAPA_PLACES[] de index.html
- **Prioridad:** MEDIA
- **Responsable:** Lead Developer[cite: 1]
- **Estado:** COMPLETADA
- **Dependencia:** TASK-001, TASK-002, TASK-003 (todas las categorias deben estar 100% en Neon) -- dependencia satisfecha desde el cierre de TASK-003 (Sprint 5).
- **Sprint:** Sprint 6
- **Detalle tecnico:** Antes de ejecutar el vaciado se verifico (Reglas de Oro v5, punto 8) si index.html tenia logica de carga dinamica propia. Resultado: index.html no tiene ningun fetch() propio; toda la carga dinamica depende de un script externo, `index-api-connector.js`, que existia ya en el repositorio pero no estaba registrado en ningun documento del AI-DOS Core (PROJECT.md, BLUEPRINT.md, DECISIONS.md, NEXT.md, BUGS_HISTORICOS.md) pese a ser critico para la carga de datos. Se solicito y verifico ese archivo antes de tocar index.html, en vez de asumir que existia o que hacia lo esperado. Confirmado que hace `fetch('/api/destinos?limit=500...')`, repuebla `PL`/`MAPA_PLACES` respetando su naturaleza `const` (via `.length=0` + `.push()`, sin romper referencias), y vuelve a invocar `renderDest()` y refresca el mapa (`refreshMapaMarkers()` o `initMapaSection()` como fallback) tras recibir los datos. Con eso confirmado, se vaciaron `PL` y `MAPA_PLACES` (quedan `const PL=[];` y `const MAPA_PLACES=[];`, declaracion preservada -- Cero Borrado Logico) mediante script Python con anclas de texto exactas (ver `vaciar_arrays_task007.py`).
- **Verificacion:** balance de `<div>` antes/despues = 0/0 (sin cambios, la edicion es 100% dentro de `<script>`); `node --check` limpio sobre el bloque `<script>` inline extraido; se rastrearon los ~20 sitios que leen `PL`/`MAPA_PLACES` en index.html y todos usan el patron `.filter(...)[0]` + guarda `if(!p) return`, por lo que ningun cambio de comportamiento inesperado (excepciones JS) ocurre con arrays vacios.
- **Pendiente conocido (fuera de alcance de esta tarea):** `renderMyMap()` (seccion personal "Mi Mapa", guardados/visitados del usuario) no es re-invocada por `index-api-connector.js` tras el fetch inicial -- solo se vuelve a llamar ante interaccion del usuario (guardar/quitar/limpiar). Si un usuario con lugares ya guardados abre esa seccion antes de interactuar, puede ver datos vacios/placeholder hasta su primera interaccion. Adicionalmente, `MM_PINS[]` (pines decorativos del mini-mapa) sigue hardcodeado con IDs de la version estatica original de `PL`; como `index-api-connector.js` reasigna `id` de forma posicional (`idx+1`) segun el orden de respuesta de la API, esos IDs ya no garantizan apuntar al mismo lugar. Ninguno de los dos rompe la carga (fallbacks seguros ya presentes), pero ambos quedan como candidatos a tarea de seguimiento.
- **CORRECCION (Sprint 7, ver BUGS_HISTORICOS.md BUG-020):** la verificacion de `index-api-connector.js` hecha en este cierre fue incompleta. Se confirmo que `replArr()`/`replObj()` usaban el patron correcto de mutacion (`.length=0`+`.push()`) pero no se verifico que `window[name]` realmente apuntara al mismo binding que los `const PL`/`const MAPA_PLACES`/`const AGENDA_EVENTS` de index.html -- no lo hace (las declaraciones `const`/`let` de nivel superior no se exponen en `window`, solo `var` y funciones). Esto dejaba `PL`/`MAPA_PLACES`/`AGENDA_EVENTS` reales permanentemente vacios pese a que el log del conector reportaba los conteos correctos. El bug ya existia antes de TASK-007 pero era invisible porque esos arrays tenian datos hardcodeados de respaldo. Corregido en Sprint 7 -- ver BUG-020 para el detalle completo y la prueba que lo confirma.
- **Evidencia fisica de exito:** index.html reducido de 4548 a 4373 lineas (-175, -68.382 bytes) al retirar los 2 arrays hardcodeados. `index-api-connector.js` (ya en produccion) queda formalmente documentado en BLUEPRINT.md seccion 5-bis.

### TASK-008: Paginas indexables de busqueda (/buscar?q=...)
- **Prioridad:** BAJA
- **Responsable:** Lead Developer + QA Specialist (SEO)[cite: 1]
- **Estado:** COMPLETADO (Agosto 2026)
- **Dependencia:** Presupuesto de endpoints de Vercel Hobby[cite: 1]
- **Sprint:** Sprint 5+ (fuera del piloto QR Terraza)[cite: 1]
- **Detalle t\u00e9cnico:** Reutilizar un endpoint de servidor para capturar las peticiones GET y permitir Server-Side Rendering b\u00e1sico para la extracci\u00f3n de meta etiquetas.
- **Evidencia f\u00edsica de \u00e9xito:** La etiqueta og:title del `<head>` cambia de manera program\u00e1tica al inspeccionar el c\u00f3digo fuente de acuerdo al par\u00e1metro `q`.
- **NOTA DE CIERRE (Agosto 2026):** Implementado sin endpoint nuevo (presupuesto Hobby 8/8): bloque `?tipo=buscar` SSR en `api/utilidades.js` (GET sin auth) + rewrite `{ "source": "/buscar", "destination": "/api/utilidades?tipo=buscar" }` en `vercel.json` (los query params del request se reenvian por defecto). Se conecto el boton "Buscar ahora" del hero: `goBuscar()` en `index.html` (si `#sinp` tiene texto navega a `/buscar?q=...`, si no conserva el scroll a `#recs`). Alcance de busqueda completo: `nombre ILIKE`, `ciudad ILIKE`, `region ILIKE`, `barrio ILIKE` y `tags::text ILIKE` (escape de comodines `\`, `%`, `_`), `LIMIT 30 ORDER BY rating DESC NULLS LAST`. Pagina indexable: `<title>`/`og:title` dinamicos segun `q`, canonical `https://exploraco.co/buscar?q=...`, `og:url`, `robots index,follow`, form GET en la pagina, grid de cards con markup del directorio (img/emoji/badge de categoria/estrellas/ciudad-region-Colombia/precio), estado vacio y sin-q, footer. Cabeceras: `Cache-Control: public, s-maxage=1800, stale-while-revalidate=3600`. Evidencia: `node --check` limpio, ASCII-safety del archivo intacto (680 bytes >127, todos pre-existentes), smoke test `smoke_buscar.js` 29/29 PASS (og:title dinamico, escape de inyeccion `<script>` y de comodines `%`/`_`, SQL parametrizado, truncado a 80 chars, balance de divs = 0, cache headers). ADR-002 respetado (bloque nuevo 100% ASCII-safe).

### TSK-066: Ruta Salsera de Bogota - 7 bares de salsa + guia de blog (nueva sesion)
- **Prioridad:** ALTA
- **Responsable:** Lead Developer + renderer-dev + seo-dev
- **Estado:** COMPLETADA (2026-08-19, esta sesion)
- **Dependencia:** TASK-001/002/003 (patron seed+loader validado), TASK-011 (deploy desbloqueado)
- **Sprint:** Sprint actual (contenido nuevo)
- **Detalle tecnico:** Se crearon 7 paginas dinamicas de categoria `sitio` (tipos_actividad='Salsa bar') + 1 post de blog guia (`categoria_slug='blog'`, multi-tema `temas:['cultura','noche','gastro','musica']`), siguiendo el patron seed+loader establecido (ej. TSK-052 Quiebracanto, TSK-047 bogota-gastronomia-guia).
  - **7 bares sitio (slugs):** galeria-cafe-libro (Parque 93/Palermo, 1982, orquestas top, galeria arte), el-goce-pagano (Las Aguas, 1978, mas antiguo, acetatos, intelectuales), sandunguera (Chapinero, 1994, Templo Salsa Clasica, clases Mie/Jue/Sab), salsa-camara (Chapinero, 1988, orquestas intl Aragon/Dan Den), habana-93 (Parque 93, 2006, lunch $29.900 12-16h + salsa vivo diario), rumbavana (Cra 19A con 16, 1992, rumba caleña, hermanos Soto), bar-continental (Cra 8 #66-18, 2020, speakeasy ron/vinilos TripAdvisor #1).
  - **Blog guia (slug ruta-salsera-de-bogota):** ~2.500 palabras, 8 fotos inline [foto:URL|texto] (Wikimedia Commons, thumbs 960px verificadas HTTP 200), multi-tema `cultura/noche/gastro/musica`, sin FAQs, sin video. Enlaza los 7 nuevos + Quiebracanto + Theatron (ya existentes). 3 rutas sugeridas (Centro, Chapinero, Parque 93) + logistica (TransMilenio, taxis, presupuesto, efectivo).
- **Archivos creados (16):** `scripts/seed-<slug>.js` (7 sitio + 1 blog, upsert SQL idempotente, `--dry`), `scripts/load-<slug>-api.js` (8 loaders DELETE+POST a `/api/admin-destinos` Bearer exploraco12345), `exploraco desarrollo/ficha-<slug>.md` (8 fichas con datos verificados).
- **Fotos:** 5 fotos por bar (hero + 4 galeria) + 8 fotos blog = 43 URLs Wikimedia Commons, todas thumbs 960px verificadas HTTP 200 (patron BUG-022). 3 fotos rate-limited en HEADs (429) funcionan en prod (diferentes IPs, cache).
- **Carga a prod:** 8 POST `/api/admin-destinos` = OK (ids nuevos, status=published, destacado=true). Fotos verificadas HTTP 200.
- **Verificacion (Escudo GOLD):** `node --check` OK en los 16 scripts; ASCII-safety 0 bytes no-ASCII; smokes: GET /api/destinos?cat=sitio total 65 (era 58, +7), slugs nuevos publicados; GET /api/destinos?categoria=blog incluye ruta-salsera-de-bogota; 8 URLs .html = 200; sitemap.xml incluye los 8 slugs nuevos; 9 fotos clave curl 200 (rate limits en HEADs son de mi IP, prod OK).
- **Evidencia fisica de exito:** /api/destinos?cat=sitio paso de 58 a 65 destinos; 7 slugs nuevos + blog; 8 URLs .html = 200; sitemap con 8 slugs nuevos; 43 fotos verificadas; Escudo GOLD limpio en 16 scripts.

### TSK-067: Actualizacion documental sesion Ruta Salsera (cierre)
- **Prioridad:** MEDIA
- **Responsable:** docs-keeper
- **Estado:** COMPLETADA (esta edicion)
- **Dependencia:** TSK-066
- **Detalle tecnico:** Actualizacion de TASKS.md (TSK-066, TSK-067), NEXT.md (segmento de sesion Ruta Salsera), DECISIONS.md (si aplica), BUGS_HISTORICOS.md (rate limits Wikimedia en HEADs, no bloqueantes). No nuevos ADRs.

### TSK-068: 5 eventos de la semana 24-30 ago 2026 en produccion
- **Prioridad:** ALTA
- **Responsable:** Lead Developer + renderer-dev + qa-auditor
- **Estado:** COMPLETADA (2026-08-24)
- **Dependencia:** TASK-003 (tags evento), patron seed+loader+smoke de Fase 9 (TSK-057..061, TSK-063)
- **Sprint:** Sprint actual (contenido nuevo)
- **Detalle tecnico:** Se crearon 5 paginas dinamicas con `categoria_slug='evento'`
  para la semana del 24 al 30 de agosto de 2026. El usuario entrego la lista
  candidata, se investigo cada evento (fechas, sedes, coordenadas, precios,
  horarios, lineups, edad minima, ticketeras) y aprobo publicarlos tal cual,
  todos `status='published'` + `destacado=true`:
  1. `maroon-5-bogota` - Maroon 5 "Love Is Like Tour", jue 27 ago, Coliseo
     MedPlus (Calle 80 km 1.5 via Cota, coords 4.7381,-74.1320), puertas 4 pm
     show 9 pm, edad minima 14, ticketera TaquillaLive, organiza Paramo;
     precios Etapa 1 $294.000-$671.000 (Etapa 2 suma $60.000 por localidad);
     fecha reprogramada desde el 25 de abril.
  2. `la-vida-es-hoy-bogota` - Camilo Cifuentes + Miguel Buitrago (Media Vida),
     jue 27 ago 7:00 pm, Universidad EAN campus Legacy (Cra 11 #78-47,
     Chapinero, coords 4.6628,-74.0558), boletaenlinea.co; reprogramado desde
     julio.
  3. `tardeando-el-centro-bogota` - jornada cultural "ultimo viernes" de la
     FUGA con aliados (I Love La Candelaria, AsoSanDiego, Asobares, Visit
     Centro Internacional), vie 28 ago 1:00 pm a medianoche, centro historico /
     La Candelaria (ancla Plaza de Bolivar 4.5981,-74.0758), mayoria gratis.
     Lineup vacio (no aplica); smoke valida que la seccion lineup NO renderice.
  4. `las-bartenders-el-musical-bogota` - cabaret de cocteleria en vivo +
     acrobacias + musica, 120 min, solo 18+, Casa E Borrero Sala Arlequin
     (Cra 24 #41-69, Park Way, coords 4.63287,-74.07520), funciones jue/vie/sab
     8:00 pm, temporada hasta sab 29 ago (fecha_inicio 27 / fecha_fin 29),
     desde $86.000 (Dinaticket/Atr\u00e1palo, rating 9.8).
  5. `juanpis-live-show-bogota` - The Juanpis Live Show "Si Nos Organizamos
     Cabemos Todos", concierto benefico AGOTADO por el Choc\u00f3 (terremoto
     M7.4 del 10 de ago, 100% del recaudo a la Fundaci\u00f3n PLAN via
     Tuboleta), sab 29 ago puertas 2 pm show 4-11 pm, Movistar Arena (coords
     4.6652,-74.0839), 18+, PULEP PQB187, zonas de donaci\u00f3n Azul/Roja/
     Plata/Dorada ($130k/$230k/$290k/$330k, todas disponibilidad 'Agotado' ->
     badge tip-red), lineup 13 artistas (Juanpis Gonz\u00e1lez anfitri\u00f3n +
     Feid, Carlos Vives, Kapo, Manuel Turizo, Mike Bah\u00eda, Santiago Cruz,
     Luis Alfonso, Nidia G\u00f3ngora, ChocQuibTown, Piso 21, Manuel Medrano,
     Monsieur Perin\u00e9); organiza Ria\u00f1o Producciones + BeatHub
     Entertainment.
- **Archivos creados (15):** `scripts/seed-<slug>.js` x5 (upsert SQL idempotente
  ON CONFLICT slug, modo `--dry`, TAGS evento completos segun TASK-003:
  `fecha_inicio`, `fecha_fin`, `edicion`, `sede`, `organiza`, `lema`,
  `lineup[]`, `agenda[]`, `categorias_entrada[]`, `que_llevar[]`,
  `prohibido[]` (+ `pulep` en Juanpis)), `scripts/load-<slug>-api.js` x5
  (DELETE+POST a `/api/admin-destinos`, Bearer exploraco12345),
  `scripts/smoke_test_<slug>.js` x5 (buildHTML en sandbox vm con fake_neon.js).
- **Hallazgo tecnico nuevo:** `esc()` de `api/pagina-destino.js` codifica
  acentos como entidades numericas (`\u00ed` -> `&#237;`), por lo que los
  `includes()` de los smokes fallan con strings con tildes. Los 5 smokes
  incluyen helper `inc()` que compara tambien la version entity-encoded
  (`html.includes(enc(s)) || html.includes(s)`).
- **Fotos:** 5 por evento (hero + 4 galeria). Se reutilizaron URLs Unsplash ya
  validadas en prod (Morat/Rock/Festivales) + 4 nuevas de cocteleria
  verificadas HEAD 200 antes de sembrar (patron BUG-022).
- **Verificacion (Escudo GOLD):** `node --check` OK en los 15 archivos;
  ASCII-safety 0 bytes no-ASCII en los 15; smokes 8 checks PASS cada uno +
  divs balanceados (178/178, 146/146, 137/137, 133/133, 216/216). Carga a
  prod: 5 POST `/api/admin-destinos` OK (ids 54a64de1-..., 8276c138-...,
  3a35f099-..., 3481dca9-..., d1a918d5-...) todos published + destacado.
- **Evidencia fisica de exito:** las 5 URLs `.html` = 200 en prod (55-60KB)
  con seccion `evento-fechas`; `/api/destinos?cat=evento` paso de 22 a 27 con
  day/month correctos derivados de `tags.fecha_inicio` (27/27/28/27/29 Ago);
  sitemap.xml incluye los 5 slugs; contenido clave verificado en prod
  (Feid + Agotado + tip-red en Juanpis; $671.000 + Coliseo MedPlus en Maroon 5).

### TSK-069: 10 hostales top de Bogota en produccion
- **Prioridad:** ALTA
- **Responsable:** Lead Developer + renderer-dev + qa-auditor
- **Estado:** COMPLETADA (2026-08-24)
- **Dependencia:** Patron seed+loader+smoke de Fase 9 (TSK-057..061, TSK-063, TSK-068); secciones hostal del motor (TASK-001, BUG-C)
- **Sprint:** Sprint actual (contenido nuevo)
- **Detalle tecnico:** Se crearon 10 paginas dinamicas con `categoria_slug='hostal'`
  para los mejores hostales de Bogota (mix ic\u00f1icos de La Candelaria + top
  rating de Chapinero). El usuario aprobo la lista final; todos
  `status='published'` + destacado editorial:
  1. `cranky-croc-hostel-bogota` - The Cranky Croc Hostel, La Candelaria,
     9.7/10 con casi 4.000 resenas en Hostelworld (el mejor valorado en
     volumen), casa colonial colorida con patio/terraza/restaurante, dorms
     desde $92.000. Booking + Hostelworld verificados.
  2. `masaya-hostel-bogota` - Masaya Bogota, Cra 2 #12-48, 9.0/10 (+2.500),
     casa colonial a 50 m del Chorro de Quevedo, free walking tour, bar y
     terraza, desayuno incluido, solo adultos 18+, mascotas con costo.
     WhatsApp real (573106092782) -> botones Reservar por habitacion.
  3. `botanico-hostel-bogota` - Botanico Hostel, Cra 2 #9-87, 9.2/10
     (+2.300), jardin tropical + rooftop, yoga diaria, desayuno incluido,
     recepcion 24h sin toque de queda, dorms desde $35.000.
  4. `viajero-bogota-hostel-spa` - Viajero Bogota Hostel & Spa, Las Nieves,
     9.5/10 (+1.300), unico del centro con spa propio (sauna/turco/
     hidromasaje gratis en privadas), restaurante La Nevera, eventos Linkup.
  5. `arche-noah-boutique-hostel-bogota` - Arche Noah Boutique Hostel,
     Cl 12F #2-09, gestion alemana, patio-jardin con cafeteria, desde $38.000;
     sin URLs de reserva verificadas -> se omiten booking_url/hostelworld_url.
  6. `granada-hostel-bogota` - Granada Hostel, Cl 11 #2-65/75, 8.9/10
     (+1.500), casona s. XX con coworking/billar/terraza solarium, agua
     caliente 24/7 alta presion, lockers gratis, recepcion 24h, minima 16.
  7. `republica-cabin-beds-bogota` - Republica Bogota Cabin Beds, Quinta
     Camacho (Chapinero), cabin beds con cortina blackout + luz propia +
     enchufe, adults-only, karaoke, entre Parque 93 y Zona T.
  8. `82hostel-bogota` - 82Hostel, Cra 19 #80-14 (Chico), economico con
     sala de juegos, cocina integrada, aparcamiento propio (raro en Bogota),
     acepta mascotas y familias.
  9. `vecinos-by-la-palmera-bogota` - Vecinos by La Palmera, Cl 70 #11a-18,
     9.7/10 (staff 9.9/limpieza 9.9), desayuno+lockers gratis, coworking y
     agenda semanal REAL renderizada como `tags.eventos_hostal[]` (Movie
     Night, Noche de Leyendas, Boardgames Night, Tejo Night, Salsa Class).
  10. `karuss-hostel-bogota` - Karuss Hostel (ex Bakano), Cl 12F #2-86,
      9.9/10: el mejor calificado de Bogota; hosts Luis y Leidy, casa nueva
      con chimenea, desayuno incluido, pago solo efectivo. WhatsApp real
      (573057875998).
  Descartados en investigacion: Selina/Socialtel (cadena quebro), La Playa
  (8.0, Teusaquillo), Fatima (3.8 TripAdvisor).
- **Archivos creados (31):** `scripts/seed-<slug>.js` x10 (upsert SQL
  idempotente, modo `--dry`, TAGS hostal completos: `tipo_alojamiento`,
  `checkin`, `checkout`, `recepcion`, `edad_minima`, `mascotas`,
  `cocina_compartida`, `barrio_descripcion`, `politica_cancelacion`,
  `reglas_casa`, `habitaciones[]` con badges popular/female/premium,
  `amenidades[]`, `actividades[]`, `que_incluye[]`, `transporte[]`,
  `eventos_hostal[]`), `scripts/load-<slug>-api.js` x10 (DELETE+POST a
  `/api/admin-destinos` enviando TAMBIEN top-level `checkin`, `checkout`,
  `habitaciones`, `amenidades`, `booking_url`, `hostelworld_url`,
  `airbnb_url` porque admin-destinos los escribe en destinos_detalles y el
  motor los lee de det.*, no de tags), `scripts/smoke_test_<slug>.js` x10
  (buildHTML en sandbox vm pasando `det` explicito) y
  `scripts/_gen_hostales_pipeline.js` (generador que produce loaders+smokes
  desde plantilla para evitar copiar/pegar x20).
- **Hallazgo tecnico:** el fallback det->tags de pagina-destino.js (~L1854)
  vive en el wrapper prod, NO dentro de buildHTML(); los smokes deben pasar
  `det={habitaciones,amenidades,checkin,checkout,...}` como segundo arg o la
  tabla de habitaciones y las pills Check-in no renderizan. Los precios
  string tipo '$92.000' pasan por money() que los normaliza.
- **Fotos:** 5 por hostal (hero + 4 galeria), todas reutilizando URLs de
  Wikimedia Commons ya validadas en prod (pool de seeds existentes); captions
  honestas de barrio/contexto (nunca interiores no verificados del hostel).
- **Verificacion (Escudo GOLD):** `node --check` OK en los 31 archivos;
  ASCII-safety 0 bytes no-ASCII en los 31 (conversor temporal); smokes PASS
  x10 (11 checks en Vecinos por eventos) + divs balanceados cada uno. Carga
  a prod: 10 POST `/api/admin-destinos` OK (ids d44f0c11-, 0baa3fc5-,
  344033a1-, 9891169d-, 8e4fe851-, bf88a8dc-, 63e850ef-, a9877c17-,
  8052f1b9-, 2e1aaf93-) todos published.
- **Evidencia fisica de exito:** las 10 URLs `.html` = 200 en prod
  (59-62KB) con secciones `habitaciones`, pill Check-in/Check-out,
  `reglas-casa`, `actividades`, `como-llegar`; Vecinos muestra
  `eventos-hostal` con su agenda semanal; WhatsApp links presentes en
  Masaya/Karuss; booking/hostelworld links presentes donde verificados.

### TSK-070: Fix Mi Mapa personal - guardados invisibles al iniciar y lista duplicada
- **Prioridad:** ALTA
- **Responsable:** Lead Developer
- **Estado:** COMPLETADA (2026-08-24, codigo verificado localmente; commit pendiente)
- **Dependencia:** Ninguna (bug de frontend en index.html + index-api-connector.js)
- **Detalle tecnico:** El usuario reporto dos bugs en la seccion Mi Viaje/
  Mi mapa personal de index.html:
  1. *No muestra los sitios guardados al iniciar* - causa raiz triple:
     (a) el primer `renderMyMap()` corria ANTES de cargar `mm_saved`/
     `mm_visited` del localStorage (la carga vivia ~30 lineas mas abajo,
     en LOAD SOCIAL STATE);
     (b) `index-api-connector.js` poblaba `MAPA_PLACES` de forma asincrona
     pero su `applyData()` nunca llamaba `renderMyMap()` (riesgo ya anotado
     en NEXT.md), asi que la seccion quedaba congelada en el estado vacio
     del primer render hasta que el usuario interactuara;
     (c) los guardados en Neon nunca se hidrataban al arrancar:
     `ExploraCO.cargarMiMapa()` existia en usuario-session.js (GET
     `/api/interacciones?tipo=mapa`, devuelve array de UUIDs activos) y
     nadie la llamaba nunca.
  2. *Lista duplicada* - `renderMMList()` solo hacia `cont.innerHTML=''`
     en el camino vacio; con resultados, cada re-render (filtros, tabs,
     renderMyMap) acumulaba `appendChild` sobre las filas previas.
  **Fixes aplicados:**
  - (A) `cont.innerHTML = ''` SIEMPRE antes del forEach en
    `renderMMList()` (index.html ~L3650).
  - (B) Carga de `mm_saved`/`mm_visited` movida al bloque INIT antes del
    primer `renderMyMap()` (index.html ~L2878) + nueva linea al final de
    `applyData()` en index-api-connector.js:
    `if (typeof renderMyMap === 'function') renderMyMap();` - con (A) es
    idempotente y repinta Mi Mapa cuando `MAPA_PLACES` ya tiene datos.
  - (C) Nueva `_hidratarGuardadosDB()` en index.html (junto a `_uuidDeId`,
    ~L4177): si hay sesion y datos cargados, trae los UUID activos via
    `cargarMiMapa()`, los mapea a ids posicionales buscando `p._uuid` en
    `MAPA_PLACES`/`PL` (convenio inverso de `_uuidDeId`), une los faltantes
    a `mmSaved`, persiste en localStorage y re-renderiza. Idempotente via
    flag `_mmHidratado`; si no hay sesion o `MAPA_PLACES` esta vacio sale
    SIN marcar el flag (reintento natural en el proximo render). No toca
    `mmVisited` (el endpoint solo devuelve guardados). Disparadores: el
    wrapper existente de `renderMyMap` (~L3790, que a su vez ahora lo
    invoca el conector tras poblar datos) y `window.onExploraCOUpdate`
    (cubre login sin reload).
- **Archivos modificados (2):** `index.html` (+75/-4),
  `index-api-connector.js` (+7).
- **Verificacion:** `node --check` OK en index-api-connector.js y en el
  bloque `<script>` inline unico de index.html extraido a temp; smoke de
  hidratacion con Node vm extrayendo la funcion real del HTML: 4/4 PASS
  (merge con dedupe por id posicional, sin sesion no marca flag,
  MAPA_PLACES vacio reintenta, DB vacia marca flag sin persistir ni
  renderizar); revision integral del diff git.
- **Evidencia fisica de exito:** guardar un lugar y recargar index.html
  muestra pin/contador/lista sin requerir interaccion; alternar tabs y
  filtros de la lista repetidas veces no duplica filas; usuario logueado
  con guardados en Neon y localStorage vacio ve sus guardados al cargar la
  pagina.
- **Riesgo conocido dejado explicito:** `mm_saved` sigue usando ids
  posicionales (`idx+1`) que dependen del ORDER BY del API entre sesiones
  (riesgo MM_PINS ya anotado); la hidratacion mapea por UUID en el momento
  correcto, pero el fix estructural (guardar slugs/UUIDs) queda como
  backlog. Ademas `clearMyMap()` borra solo local: con sesion activa los
  guardados de BD reviven al recargar (candidato: llamar `quitarGuardado`
  por UUID desde clearMyMap).

### TSK-071: Modulo Blog visible en admin + editor de escritos con preview fiel al motor
- **Prioridad:** ALTA
- **Responsable:** admin-dev + renderer-dev
- **Estado:** COMPLETADA (2026-08-24, codigo verificado localmente; commit pendiente)
- **Dependencia:** Ninguna (solo admin.html; el soporte blog del formulario
  ya existia desde las sesiones Sprint Inspirate pero era invisible)
- **Detalle tecnico:** El usuario reporto "no veo nada relacionado a blog"
  en admin.html. Investigacion confirmo que TODO el modulo existia (filtro
  pill Blog en la tabla, categoria en el form, panel especifico-blog con
  tabs Historia/Autor, buscador de autor, CRUD PUT/DELETE) PERO no habia
  entrada en el sidebar: updateNavCounts() calculaba `snav-count-blog` sin
  encontrar el elemento en el DOM. Se implemento:
  1. *Entrada sidebar* "Blog" con contador (`showScreenCat('tabla','blog')`,
     id snav-blog/snav-count-blog) tras Eventos + titulo 'BLOG' agregado al
     mapa de labels de showScreenCat (antes caia en 'TODOS').
  2. *Herramientas del cuerpo* (visibles solo cat=blog via
     updateBlogBodyTools() enganchado a updateCatUI() y newPlace()):
     boton Ampliar (overlay pantalla completa #blog-desc-overlay con COPIA
     del valor en #f-desc-big, sincronizado de vuelta al cerrar -- nunca se
     mueve el #f-desc original), botones Foto/Video que insertan
     [foto:URL|caption] / [video:URL] en la posicion del cursor como bloque
     propio (separado por linea vacia, requisito del parser), y contador
     palabras/min con la formula EXACTA del motor
     (Math.max(1, Math.round(palabras/200)), pagina-destino.js L562).
  3. *Preview client-side* (#blog-preview-modal): builder
     blogBuildCuerpoHtml()/blogVideoEmbedUrl() = puerto literal de
     parseBlogBody()/videoEmbedUrlBlog() del motor; renderiza titulo,
     lead, autor seleccionado (_blogAutorNombre stash en
     blogSeleccionarAutor/blogLimpiarAutor/reset), cuerpo con marcadores y
     video principal; CSS replica .bfig/.bvid/.stext del motor (L192-196).
     Cierra con ✕/Esc/click-fuera.
- **Archivo modificado:** `admin.html` (+~230 lineas).
- **Verificacion:** node --check OK del bloque script inline unico;
  smoke de fidelidad con Node vm extrayendo funciones reales de AMBOS
  archivos (esc del servidor inyectado como _esc para aislar la logica):
  19/19 PASS -- salidas identicas en parrafos, fotos validas/invalidas/
  sin caption/malformadas, videos YouTube watch/youtu.be/Vimeo/dominio
  prohibido/malformados, mixtos y bordes (saltos con espacios, vacio).
  Hallazgo del harness: en la vm hay que inyectar la global URL (en
  Vercel/Node existe nativa).
- **Evidencia fisica de exito:** el sidebar muestra "Blog" con el conteo
  real de posts; clic filtra la tabla con titulo BLOG; editar un post
  abre tabs Historia/Autor; con cat=blog aparecen Ampliar/Foto/Video/
  Preview y el contador; Ampliar edita comodo y sincroniza al salir;
  Preview muestra el articulo igual que lo renderizara pagina-destino.js.

### TASK-009: Integracion de pagos Wompi/PSE para planes destacados
- **Prioridad:** BAJA
- **Responsable:** Lead Developer[cite: 1]
- **Estado:** PENDIENTE[cite: 1]
- **Dependencia:** Ninguna[cite: 1]
- **Sprint:** Sprint 5+[cite: 1]
- **Detalle t\u00e9cnico:** Incluir el script de Wompi Widget y parametrizar la l\u00f3gica para generar una transacci\u00f3n atada al ID del plan.
- **Evidencia f\u00edsica de \u00e9xito:** Redirecci\u00f3n segura completada hacia el simulador de checkout de PSE en entorno Sandbox.

### TASK-010: Notificacion por WhatsApp al due\u00f1o cuando el admin aprueba un lugar
- **Prioridad:** BAJA
- **Responsable:** Lead Developer[cite: 1]
- **Estado:** PENDIENTE[cite: 1]
- **Dependencia:** RESEND_API_KEY o servicio equivalente de mensajeria configurado[cite: 1]
- **Sprint:** Sprint 5+[cite: 1]
- **Detalle t\u00e9cnico:** Configurar un webhook de disparo hacia un proveedor de mensajer\u00eda cuando se modifique la columna de estado del lugar a aprobado.
- **Evidencia f\u00edsica de \u00e9xito:** Recepci\u00f3n instant\u00e1nea del mensaje SMS o WhatsApp en un dispositivo m\u00f3vil de prueba tras guardar los cambios en el panel de administraci\u00f3n.

### TASK-011: Desbloquear el deploy de Vercel (causa desconocida)
- **Prioridad:** ALTA
- **Responsable:** Project Manager (Javier) + Lead Developer
- **Estado:** COMPLETADA
- **Dependencia:** Ninguna
- **Detalle t\u00e9cnico:** El deploy automatico de Vercel desde GitHub sigue fallando sin causa identificada. Bloquea la visibilidad en produccion de los cambios multi-tema de TSK-044 (api/destinos.js, index.html, api/pagina-destino.js, admin.html) y de los cambios de TASK-008/TSK-017 pendientes desde sesiones previas. Diagnostico iniciado pero pausado: revisar logs de build de Vercel (dashboard o `vercel logs`) y comparar con el ultimo deploy exitoso. Posibles sospechosos: algun archivo nuevo que rompa el build de la funcion serverless, cambios en vercel.json, o limites del plan Hobby.
- **Evidencia f\u00edsica de \u00e9xito:** Un commit nuevo a main (o redeploy manual) pasa el build de Vercel y queda visible en https://exploraco.vercel.app; `/api/destinos?categoria=blog` devuelve el post con `temas[]` (array multi-tema).

### TASK-012: Aplicar migracion db/migrations/004_usuarios_blog_autor.sql en Neon
- **Prioridad:** MEDIA
- **Responsable:** Lead Developer (con acceso a la URL de Neon)
- **Estado:** COMPLETADA (verificada en prod el 2026-08-19: columnas `foto_url` y `ciudad_base` presentes en la respuesta de GET /api/usuarios?id=...)
- **Dependencia:** Ninguna (el archivo ya existe en el repo, ADR-008 cumplido)
- **Detalle t\u00e9cnico:** Aplicar en Neon la migracion versionada `db/migrations/004_usuarios_blog_autor.sql` que agrega `usuarios.foto_url` y `usuarios.ciudad_base` (requeridas por la seccion "Quien escribe" del renderer de blog y por el buscador de autor de admin.html). Es idempotente (`ADD COLUMN IF NOT EXISTS`). El post monserrate-guia-completa se creo SIN `id_autor` a proposito hasta que esta migracion se aplique.
- **Evidencia f\u00edsica de \u00e9xito:** `SELECT column_name FROM information_schema.columns WHERE table_name='usuarios'` muestra `foto_url` y `ciudad_base`; al guardar el post desde admin.html con un autor asignado, la seccion "Quien escribe" aparece en /monserrate-guia-completa.html.

### TASK-013: Asignar autor al post de blog monserrate-guia-completa desde admin.html
- **Prioridad:** BAJA
- **Responsable:** Project Manager (Javier)
- **Estado:** PENDIENTE (dependencia TASK-012 ya COMPLETADA -- el autor ya puede asignarse desde admin.html)
- **Dependencia:** TASK-012 (migracion 004 aplicada)
- **Detalle t\u00e9cnico:** Editar el post monserrate-guia-completa desde admin.html usando el buscador de autor (que filtra usuarios ya registrados) y guardar. El renderer de blog omitira la seccion "Quien escribe" mientras el post no tenga `id_autor`.
- **Evidencia f\u00edsica de \u00e9xito:** /monserrate-guia-completa.html muestra la seccion "Quien escribe" con nombre/foto/ciudad del autor.

### TASK-014: Push a GitHub de la sesion actual (blog + multi-tema)
- **Prioridad:** ALTA
- **Responsable:** Project Manager (Javier)
- **Estado:** PENDIENTE
- **Dependencia:** Sesion de Chrome con GCM (gestor de credenciales) activa
- **Detalle t\u00e9cnico:** Hacer commit y push al repo gonzalezjavierbta-afk/exploraco de los archivos de esta sesion: `scripts/seed-monserrate-guia.js`, `scripts/load-monserrate-guia-api.js`, `exploraco desarrollo/ficha-monserrate-guia.md`, `db/migrations/004_usuarios_blog_autor.sql`, mas los cambios multi-tema de `api/destinos.js`, `index.html`, `api/pagina-destino.js` y `admin.html`. El push depende de la sesion Chrome/GCM y no se pudo ejecutar en esta sesion.
- **Evidencia f\u00edsica de \u00e9xito:** `git log --oneline -1` muestra el commit nuevo en el remoto.

### TASK-015: Pagina /blog.html con SSR de listado de blog (Fase 1)
- **Prioridad:** ALTA
- **Responsable:** Lead Developer + backend-dev
- **Estado:** COMPLETADA (commit c3311d8, verificada en prod: /blog.html 200 con cards, buscador filtra, boton Inspirate lleva a la pagina)
- **Dependencia:** TASK-011 (deploy desbloqueado)
- **Detalle t\u00e9cnico:** Implementar el listado de blog como `?tipo=blog-lista` DENTRO de `api/utilidades.js` (respeta ADR-010 presupuesto 8/8). SSR de `/blog.html` con buscador client-side instantaneo (JSON embebido con `<` escapado a `\u003c`, filtro por texto + chips de tema), grid de cards sin estrellas (ADR-007/009) con fecha + badge Destacado + min de lectura + ubicacion, LIMIT 50 sin paginacion, dos estados vacios (sin posts / sin coincidencias), title/canonical `https://exploraco.co/blog.html`, robots indexable. Rewrite en vercel.json ANTES de `/:slug.html`. Boton de index.html:1434 cambia de `openBlogModal()` a `href="blog.html"`.
- **Evidencia f\u00edsica de \u00e9xito:** `/blog.html` en produccion responde 200 con las cards de posts publicados, el buscador filtra por texto y tema, y el enlace desde Inspirate lleva a la pagina.

### TASK-016: Fotos/videos inline en el cuerpo del blog (Fase 2)
- **Prioridad:** ALTA
- **Responsable:** renderer-dev
- **Estado:** COMPLETADA (commit 8f48f42, verificada en prod: 4 figures con foto y caption inline entre los parrafos)
- **Dependencia:** TASK-015 (Fase 1)
- **Detalle t\u00e9cnico:** Nueva funcion `parseBlogBody()` en `api/pagina-destino.js` (server-side, ASCII-safe, sin backticks) que divide `descripcion` en bloques por `\n\n` y convierte los marcadores inline `[foto:URL|texto]` -> `<figure class="bfig">` con img+figcaption y `[video:URL]` -> `<div class="bvid">` con iframe via `videoEmbedUrlBlog()`. URLs de foto validadas http/https, texto escapado con `esc()`, marcadores mal formados descartados sin romper el render. Solo aplica a `categoria_slug==='blog'`; las demas categorias conservan su `<p class="stext">` con `white-space:pre-line`. CSS nuevo `.bfig` (img 100% con max-height 480px, radius 12px, caption centrado) y `.bvid` (aspect-ratio 16:9). Seed de Monserrate actualizado con 4 marcadores en puntos naturales (basilica, funicular, vista desde la cima, flora).
- **Evidencia f\u00edsica de \u00e9xito:** /monserrate-guia-completa.html en produccion muestra 4 figures con foto y caption inline entre los parrafos; smoke tests: fase2 16/16 PASS (incluye XSS, javascript: descartado, video invalido descartado, balance de divs 0) y regresion blog 19/19 PASS.

### TASK-017: Resenas de blog con estrellas 1-5 (Fase 3)
- **Prioridad:** ALTA
- **Responsable:** renderer-dev + backend-dev
- **Estado:** COMPLETADA (codigo commit f09de13 + docs/limpieza commit 7e05b88, verificada en prod: seccion "Resenas del articulo" con formulario simplificado)
- **Dependencia:** TASK-016 (Fase 2)
- **Detalle t\u00e9cnico:** Se habilitan las resenas para la categoria blog pero con formulario SIMPLIFICADO: estrellas 1-5 + nombre + comentario, sin puntuacion por dimensiones (dims), sin "Fuiste como" (traveller_type) y sin voto rapido (#qr-stars). El JS inline de reseñas (submitRv/addRvOptimista) ya era generico y funciona igual con dims/traveller vacios (publicarResena en usuario-session.js acepta ambos opcionales, y interacciones.js los inserta como vacios). Se cambia el titulo a "Resenas del articulo" y el placeholder del comentario. Las demas categorias conservan el widget completo. Nav incluye la seccion (ya tenia has:!!secResenas).
- **Evidencia f\u00edsica de \u00e9xito:** /monserrate-guia-completa.html en produccion muestra la seccion "Resenas del articulo" con formulario de 5 estrellas + nombre + comentario (sin dims ni tipo de viajero ni voto rapido); el promedio se muestra arriba; balance de divs 0 en smoke blog 23/23 y regresion evento 13/13.

### TASK-018: Diseño moderno minimalista del post de blog (Fase 4)
- **Prioridad:** ALTA
- **Responsable:** renderer-dev
- **Estado:** COMPLETADA (commit 98eb7de, verificada en prod: post con hero bhero de portada, columna de lectura, sin subnav ni gstrip)
- **Dependencia:** TASK-017 (Fase 3)
- **Detalle t\u00e9cnico:** Variante de diseño propia para `categoria_slug==='blog'` que distingue un articulo de un destino. Hero nuevo `.bhero`: foto de portada ancha (`.bcover` a todo el ancho, height min(52vh,440px)) con bloque de titulo/lead/chips limpio sobre fondo crema (`.bhin`/`.bhtitle`/`.bhslead`/`.bchips`), sin grid de 3 thumbs (`.prow`), sin botones Contactar/Como llegar/Guardar/Estuve aqui y sin barra dorada de rating (`.gstrip` desactivada para blog). Sin subnav sticky (`subnav` vacio si cat==='blog'). El `<body>` lleva la clase `blog` que activa columna de lectura ~720px (`body.blog .sin{max-width:720px}`), texto 16px/1.8, oculta la numeracion dorada (`body.blog .stnum{display:none}`) y suaviza la tipografia de titulos. Se conservan todas las secciones del articulo: La historia (con fotos inline .bfig), video, FAQs, reseñas con estrellas y autor.
- **Evidencia f\u00edsica de \u00e9xito:** /monserrate-guia-completa.html en produccion se ve como un articulo de blog moderno minimalista (hero de portada ancha, sin grid de thumbs ni subnav sticky, columna de lectura centrada, sin numeracion dorada), distinto del render de destinos; smoke blog 34/34 PASS (incluye checks Fase 4: body.blog, bhero, bhtitle, bhslead, bchips, bcover, sin subnav, sin gstrip, sin prow, stnum oculto por CSS) y regresion evento/sitio 13/13.

### TASK-019: Recorte del seed de Monserrate a ~3000 palabras (Fase 5)
- **Prioridad:** MEDIA
- **Responsable:** renderer-dev
- **Estado:** COMPLETADA (commit 2ed18ff, re-seed en prod con id cf9dea6d, verificada: 3.018 palabras, 15 min de lectura, 4 figures inline)
- **Dependencia:** TASK-018 (Fase 4)
- **Detalle t\u00e9cnico:** Recorte editorial del cuerpo del post para mejorar la legibilidad y el tiempo de lectura (de ~31 min a ~15 min). Se conservaron los parrafos esenciales por bloques tematicos: introduccion e historia (1-8), funicular y teleferico (9-12), ubicacion y sendero peatonal (13-16), tarifas y horarios (17-20), mejor epoca y hora (21-22), la cima y gastronomia (23-27), biodiversidad y flora (28-32), consejo de altura (35) y cierre (68-69). Los 4 marcadores [foto:] se conservan intactos (parrafos 6, 10, 24, 29). Las FAQs no cambian. El reemplazo se hizo por bloque exacto de string (script Node en temp, separador real es el escape `\n\n` dentro del string JS).
- **Evidencia f\u00edsica de \u00e9xito:** el post en produccion reporta ~3.018 palabras (el renderer calcula el tiempo de lectura desde la longitud), mantiene las 4 fotos inline, y el smoke blog sigue 34/34 PASS (html baja de 80.4KB a 61.0KB).

---

### TSK-072: Hostal R10 en directorio - seed + loader + smoke
- **Estado:** COMPLETADA
- **Detalle:** Pagina dinamica del Hostal R10 (La Candelaria, Bogota),
  casona historica remodelada para estudiantes de intercambio. Datos de
  HW 8.8/10 (679 reviews), Booking 8.4 (1.858 reviews). 18+ exclusivo,
  4 dorms con literas privadas + 6 privadas, bar, terraza hamacas, city
  tour gratis, coworking, recepcion 24h. Check-in 15:00-24:00, checkout
  12:00, cancelacion 24h, impuestos 19% no incluidos. Archivos:
  `scripts/seed-hostal-r10-bogota.js` (3 habitaciones, 14 amenidades, 5
  actividades, 3 transporte, 5 FAQs), `scripts/load-hostal-r10-bogota-api.js`,
  `scripts/smoke_test_hostal-r10-bogota.js`. Generador actualizado (11
  hostales, 22 archivos).
- **Evidencia:** `/hostal-r10-bogota.html` en produccion 200 con todas
  las secciones; smoke 11/11 PASS; precio_desde '$55.000' (fix
  concatenacion). Directorio hostal estatico no incluye R10 (PL embebido,
  backlog conocido).

### TSK-073: La K-zona en directorio - seed + loader + smoke + prod
- **Estado:** COMPLETADA
- **Detalle:** Pagina dinamica de LaK-Zona (Espacio Cultural Artistico
  Alternativo, Calle 15 # 9-64, barrio Veracruz, Centro Historico de
  Bogota; antigua categoria sitio como Espacio Kinder). Colectivo de
  artivistas/gestores (ONG LaK-Zona // ASOCAMEC, sin animo de lucro,
  2010/2015) que fomenta Derechos Culturales. Espacios (Las Zonas):
  studio produccion musical, ensayos (acustico/bateria), danza o circo
  (20 m2), proyeccion audiovisual (30 m2, aforo 40), K-Fe (70 m2, aforo
  80), Auditorio (escenario 265.5 m2, aforo 500), Galerias (45 m),
  Oficinas/Coworking; turismo comunitario: Museo Urbano-Ancestral de la
  Memoria (1000+ m2), residencias artisticas (apartaestudio 30 m2),
  visitas guiadas. Programacion semanal de entrada libre 5pm-11pm
  (mier Sesiones PIYAA, jueves Somos Calle, viernes Junte Salsero, sab
  K-Fe). Fuente: lak-zona.org (+ IG @lakzonaeslazona, Eventario/Yandex).
  Archivos: `scripts/seed-la-k-zona.js` (8 zonas, 4 entradas, 2 tours, 4
  equipamiento, 4 itinerario, 4 secretos, 4 regulaciones, 6 FAQs),
  `scripts/load-la-k-zona-api.js`, `scripts/smoke_test_la_k_zona.js`.
- **Evidencia:** `/la-k-zona.html` en produccion 200 (71KB) con todas
  las secciones del motor sitio (dificultad, entradas, tours, checklist,
  itinerario, fauna, secretos, regulaciones, galeria, mapa, FAQ);
  smoke 11/11 PASS (balance divs 0); node --check y ASCII-safe clean
  (0 no-ASCII). slug=la-k-zona, id 2daadd88-831c-4584-8193-afdb4bc07d72.
  Nota: coords aprox. del Centro (calle 15 #9-64). Directorio sitio
  estatico no incluye la-k-zona (PL embebido, backlog conocido).

### TSK-074: 10 eventos de la semana 5-11 sep 2026 como paginas dinamicas de evento
- **Estado:** COMPLETADA
- **Detalle:** 10 paginas dinamicas (categoria evento) con eventos reales y
  unicos de la semana 5 al 11 de septiembre de 2026 en Colombia, cada uno
  con su triple de archivos (seed + loader + smoke, patron Fase 9 / TSK-068).
  30 scripts creados en `scripts/` (10 seeds + 10 loaders + 10 smoke tests),
  siguiendo el patron TSK-068: seed-<slug>.js con SLUG/HERO/PHOTOS/BASE/
  TAGS/FAQS ASCII-safe con escapes \\uXXXX, load-<slug>-api.js que POST a
  /api/admin-destinos en https://exploraco.vercel.app con token por defecto
  exploraco12345, smoke_test_<slug>.js con buildHTML via VM.
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
  Tags JSONB por evento: fecha_inicio/fin, edicion, sede, organiza, lema,
  lineup[], agenda[], categorias_entrada[], que_llevar[], prohibido[].
  Contenido 100% ASCII-safe (escapes \\uXXXX, 0 bytes no-ASCII en los 30
  nuevos scripts).
- **Evidencia:** `node --check` 30/30 OK; 10/10 smoke tests PASS; 0 bytes
  no-ASCII en los 30 nuevos scripts. Cargados en produccion via loaders
  (`POST /api/admin-destinos`, Bearer default) -> todos
  `status=published` con 5 fotos y 5-6 FAQs. Paginas en vivo verificadas
  200 OK (len ~55-61KB). `/api/destinos?cat=evento` lista 47 eventos.
  Spot-check: divs balanceados en smokes (174-188 abiertos=cerrados).
  Directorio evento estatico no incluye estos slugs (PL embebido,
  backlog conocido).
- **Commit:** `71d18f7` "feat: 10 eventos sem 5-11 sep como paginas
  dinamicas (TSK-074) - seeds, loaders y smoke tests en prod"
  (pusheado a main).

---

### TSK-075: Campo web oficial visible y prominente en el hero de la ficha (pagina-destino.js)
- **Estado:** COMPLETADA
- **Detalle:** Auditoria (2026-08-31) revelo que la pagina web oficial
  (`destinos.web`) se capturaba en 2 formularios (publico `sitio_web`,
  admin `f-web`) y viajaba en la API, pero SOLO se publicaba como un boton
  secundario "Sitio web" en la seccion Contacto del detalle
  (`pagina-destino.js:1554`), sin aparecer en home, directorios ni agenda
  (pese a que los conectores ya exponian `web`). Decidido (usuario):
  elevarla a informacion oficial prominente en el hero de la ficha.
  Cambios en `api/pagina-destino.js`: helper `dominioWeb(u)` (extrae
  hostname legible sin protocolo ni "www."), chip-link `.hqi.hqilink` en la
  fila HQI que muestra el dominio como dato visible tras el horario, y boton
  CTA primario "Sitio web oficial" (`hbtn`) al inicio de `hctar` en el hero.
  El boton secundario de Contacto se conserva (refuerza, no duplica).
  Blogs excluidos (un articulo no es un lugar con sitio oficial),
  consistente con la exclusion actual de `secContact`.
- **Evidencia:** `node --check` PASS; ASCII-safety 0 bytes >127 y 0
  backticks; smoke dedicado PASS (con `web` -> boton + chip de dominio en
  hero + boton Contacto conservado; sin `web` -> ausencia total, divs
  balanceados 83/78); los 39 smokes existentes siguen PASS tras el cambio
  y los eventos con `web` (ulibro 180/180, medejazz 188/188) intactos.
- **Backlog (no implementado, auditado):** home `renderDest()/renderAgenda()`,
  directorios `renderDir()` (y fallback `var PLACES` sin campo `web`),
  agenda `toAgendaEvent()`, y schemaLD JSON-LD aun no muestran `web`.
  Pendiente de decidir si se extiende fuera del hero.

### TSK-076: Eventos semana 31 ago - 6 sep 2026 (batch previo, en produccion)
- **Estado:** COMPLETADA (verificada 2026-09-05)
- **Detalle:** Batch de eventos de la semana del 31 de agosto al 6 de
  septiembre de 2026, anterior a TSK-074 (que documenta la semana 5-11
  sep, commit 71d18f7). Este batch estaba ya publicado en produccion pero
  sin entrada documental propia en TASKS.md. Separado de TSK-074 en esta
  sesion para mantener trazabilidad correcta.
  Slugs verificados en vivo contra la API de produccion
  (https://exploraco.vercel.app/api/destinos) el 2026-09-05 (10 slugs):
  1. `semana-del-bienestar-bogota` - bienestar hol\u00edstico, 31 ago-4 sep.
  2. `libera-2026-bogota` - feria de coleccionismo y cultura alternativa,
     Plaza de la Hoja.
  3. `festival-teatro-libre-bogota` - teatro contempor\u00e1neo en 11 sedes.
  4. `hearth-summit-bogota` - encuentro/rave sonoro en la Candelaria.
  5. `sabor-bogota` - feria gastron\u00f3mica, 3-6 sep.
  6. `vive-mejor-bogota` - expo de vida saludable.
  7. `dia-del-arte-urbano-bogota` - festival de muralismo y street art,
     4-6 sep.
  8. `ulibro-bucaramanga` - Feria del Libro UNAB, edicion 24
     "Habitemos lo salvaje", 28 ago-6 sep, cierre Claudio Narea.
  9. `medejazz-medellin` - Festival de Jazz, 30 aniversario, 5-19 sep,
     Orquesta Arag\u00f3n y Joseph Amado.
  10. `travesia-rio-magdalena` - expedicion fluvial del brazo de Loba,
      2-6 sep, 20 embarcaciones.
  TSK-074 (semana 5-11 sep) documenta 10 slugs diferentes
  (arcangel-medellin-2026, ferias-y-fiestas-guaduas-2026,
  los-parceritos-villavicencio, parranda-vallenata-barranquilla,
  queentaesencia-homenaje-queen-medellin, festival-cordillera-2026,
  jazz-al-parque-2026, justin-quiles-lenny-tavarez-bogota,
  john-summit-chamorro-bogota, stray-kids-bogota) que corresponden a
  la semana siguiente.
- **Evidencia:** Los 10 slugs verificados en vivo contra la API de
  produccion: GET /api/destinos -> slugs presentes con status=published.
  Fecha de verificacion: 2026-09-05.
- **Nota cruzada:** Este batch se separa de TSK-074 (commit 71d18f7),
  que documenta la semana 5-11 sep 2026 con 10 paginas dinamicas.

### TSK-077: Canon del Guejar y Las Gachas en directorio - fichas + seeds + loaders + smokes + prod
- **Estado:** COMPLETADA
- **Detalle:** Dos paginas dinamicas de categoria sitio agregadas al
  directorio (patron TSK-073 la-k-zona), nuevas por investigacion web de
  las dos fuentes (maravillasdelguejar.com para el canon y
  sinitinerario.com para Las Gachas).
  1. `canon-del-guejar` (id 83): Can\u00f3n del Guejar, Mesetas (Meta).
     La entrada representa el DESTINO y usa al operador Maravillas del
     Guejar como contacto/web de referencia (maravillasdelguejar.com,
     WhatsApp 573144457907, maravillasdelguejar@gmail.com, IG
     maravillas_del_guejar) segun decision de la sesion. Lat/Lng 3.3840276,
     -74.0438661 (Mesetas). Rafting 17 km cat 3 desde $357.000, 5
     Maravillas del Parque Guejar, Charco Azul, Cueva de los Guacharos.
     5 fotos Commons verificadas (curl 200/206), 6 FAQs.
  2. `las-gachas` (id 82): Las Gachas, Guadalupe (Santander). Pocetas
     naturales de aguas turquesas sobre piedra roja a 20 min por el Camino
     Real; sin web oficial (campo web vac\u00edo; enlaces de reserva a la
     guia local sinitinerario.com/las-gachas/). Lat/Lng 6.2468, -73.4182.
     5 fotos Commons verificadas, 6 FAQs.
  Ambos: `categoria_slug='sitio'`, `status='published'`, `destacado=true`,
  **rating 0** (ADR-009; el badge hero "★ 4.8 \u00b7 Nuevo" es placeholder
  del motor pagina-destino.js:634-638 cuando rat=0, no dato guardado).
  Archivos creados (los 6, ASCII-safe 0 bytes >127): `scripts/
  seed-canon-del-guejar.js` + `load-canon-del-guejar-api.js` +
  `smoke_test_canon_del_guejar.js` y `scripts/seed-las-gachas.js` +
  `load-las-gachas-api.js` + `smoke_test_las_gachas.js`. Leccion de la
  sesion: el renderer construye el link de Instagram con
  (d.instagram||'').replace('@','') (pagina-destino.js:1569), por lo que
  el seed guarda el handle SIN '@'. Tarjetas estaticas agregadas a
  `directorio.html` y `directorio-sitio.html` (ids 83 y 82 al inicio de
  PLACES, 82/83 al final de FEAT y entradas 82/83 en PHOTOS).
- **Evidencia:** Carga en prod v\u00eda loaders (DELETE+POST Bearer
  exploraco12345): las-gachas id fd216d5c-... y canon-del-guejar id
  9501e3b7-... status=published. Verificacion en vivo 2026-09-07:
  /canon-del-guejar.html y /las-gachas.html = 200; API pagina-destino de
  ambos slugs renderiza todas las secciones sitio (dificultad + matriz de
  epoca, entradas, tours, checklist, itinerario, fauna, secretos,
  regulaciones, galeria 5 fotos, mapa, FAQ 6, resenas con RV_AVG=0/
  RV_COUNT=0, contacto); /api/destinos?categoria=sitio lista ambos
  (69 sitios, antes 67); sitemap/exploraco.co incluye los dos slugs.
  Escudo GOLD: node --check 6 scripts PASS; ASCII-safety 0 bytes >127;
  smokes 11/11 y 10/10 PASS con divs balanceados (373/373 y 316/316);
  bloques PLACES/FEAT/PHOTOS evaluados por VM en ambos directorios
  (places=83/30, feat=13, photosKeys=83). Coordenadas aproximadas
   via Nominatim (Mesetas 3.3840276,-74.0438661; Guadalupe 6.2468,-73.4182).

### TSK-078: 3 eventos "hoy/en curso" (7 sep 2026) como paginas dinamicas + referente agenda
- **Estado:** COMPLETADA
- **Detalle:** A pedido del usuario se (a) creo el archivo de referentes de
  la agenda (`exploraco desarrollo/referentes-agenda.md`) con el Instagram
  @quehaypahacerenbogota como inspiracion diaria (NO scrapeable, ver nota) y
  las fuentes oficiales verificables (bogota.gov.co, idartes.gov.co,
  culturarecreacionydeporte.gov.co, visitbogota.co, tuboleta.com, idpc.gov.co),
  y (b) se crearon 3 paginas dinamicas de evento para "hoy/en curso"
  (lunes 7 sep 2026) con el patron Fase 9 (seed + loader + smoke):
  1. `jazz-expandido-bogota` (id c9b13826-...): temporada de jazz del Centro
     Nacional de las Artes (Teatro Colon, Sala Delia Zapata, Sala Fanny Mikey,
     Plazoleta), 4-27 sep 2026, musicos de 6 paises. Lineup 9 artistas
     (Davi Fonseca, Luca Ciarla, Michael Varekamp, Rembrandt Trio, Tiken Jah
     Fakoly, Buika+OSN...). Fuente: La Republica 2026-09-07.
  2. `mes-del-patrimonio-bogota` (id c18674eb-...): Mes del Patrimonio 2026
     (IDPC + SDCRD), todo septiembre, 50+ actividades gratis, lema "Memoria
     que construye futuro", 20 anos del IDPC. Fuente: bogota.gov.co.
  3. `transitos-fragmentados-bogota` (id e8771df6-...): exposicion
     fotografica de Isabella Vargas y Mary Barrios en el CEFE Chapinero,
     3-12 sep 2026, entrada libre. Fuente: bogota.gov.co / Pulzo.
  Los 3: `categoria_slug='evento'`, `status='published'`, `destacado=true`,
  rating 0 (ADR-009). Archivos creados (9, ASCII-safe 0 bytes >127):
  3 seeds + 3 loaders + 3 smokes en `scripts/`. Slugs con sufijo `-bogota`
  para no colisionar con HTML estatico de la raiz.
- **Evidencia:** Escudo GOLD: node --check 9/9 PASS; ASCII-safety 0 bytes
  >127; smokes 3/3 PASS con divs balanceados (190/190, 180/180, 168/168).
  Carga en prod via loaders (DELETE+POST Bearer exploraco12345): los 3
  status=published. Verificacion en vivo 2026-09-07: las 3 URLs .html = 200
  (58-61KB); /api/destinos?cat=evento lista 50 eventos con day/month reales
  (4/1/3 Sep); sitemap.xml incluye los 3 slugs. Nota: Instagram no es
  scrapeable (solo devuelve logo base64); los datos se verificaron en
  fuentes oficiales abiertas.

### TSK-079: Pagina dinamica parque-mundo-aventura.html (parque de atracciones en Kennedy)
- **Estado:** COMPLETADA
- **Detalle:** Pagina del Parque Mundo Aventura (cat sitio, slug
  `parque-mundo-aventura`, `status='published'`, `destacado=true`, rating 0)
  con datos reales 2026: el parque de atracciones numero uno de Colombia por
  visitantes (13 ha en Kennedy - Hipotecho, Carrera 71D # 1-14 Sur), abrio
  el 30-ene-1998 como aporte de la Camara de Comercio de Bogota (Corparques),
  +40 atracciones en zonas tematicas, Gravity torre de caida libre mas alta
  de Colombia (57 m, 2023), modelo de acceso unico: ingreso gratuito y solo
  se paga por usar las atracciones. Precios 2026: Pasaporte Gold $95.000 /
  Silver $84.000 / Kids $73.000 / FilaExpress $73.000; ingreso al parque
  gratuito. 8 fotos verificadas, 5 FAQs, 3 tours (rating '0'/review_count 0,
  ADR-009). Fuentes: mundoaventura.com.co, Wikipedia, kennedy.gov.co,
  visitbogota.co/IDT. Archivos: `scripts/seed-parque-mundo-aventura.js`
  (21 keys TAGS sitio), `scripts/load-parque-mundo-aventura-api.js`,
  `scripts/smoke_test_parque_mundo_aventura.js` y
  `exploraco desarrollo/ficha-parque-mundo-aventura.md`.
  Nota: coordenadas corregidas a lat 4.622054, lng -74.134912 (el borrador
  inicial apuntaba ~4 km al norte).
- **Evidencia:** Escudo GOLD PASS: node --check OK en los 3 scripts;
  ASCII-safety 0 bytes >127 en los 3; smoke test 15 checks PASS + balance
  de divs open=339 close=339 diff=0. Carga en prod via loader (DELETE+POST
  Bearer exploraco12345): destino creado id 47692fc4-1775-47e2-96fd-36eaae5004b4
  status=published destacado=True. Verificacion en vivo 2026-09-07:
  /parque-mundo-aventura.html = 200 con las 15 secciones del motor sitio
  (hero con chip de dominio y boton "Sitio web oficial", rating 0.0/0
  resenas); /api/destinos?categoria=sitio lista el slug (name=Parque Mundo
  Aventura, cat=sitio, id 47692fc4-...); sitemap.xml incluye el slug
  (lastmod 2026-09-07).

### TSK-080: Milestones v2 - Plan Maestro de Gaming (Steam + SKATE + Albion)
- **Estado:** COMPLETADA (implementado y verificado localmente 2026-09-07;
  pendiente migracion 007 en Neon + deploy)
- **Detalle:** Implementacion del Plan Maestro de Gaming del prompt
  `prompt gsming.txt` con las 3 respuestas de calibracion de Javier
  (1. Own the Spot BAJO DEMANDA; 2. Tabla de Destino como mapa de nodos
  SVG; 3. Patrocinios con opcion abierta, solo diseno). Cambios:
  1. `api/interacciones.js` (v6): helpers `esLiderDeCiudad`/`xpConMultiplicador`
     (multiplicador x1.1 sobre XP base en la ciudad del lider, aplicado en
     los 4 POST: resena/guardado/visita/rating; degrada a XP base si la
     migracion 007 no corrio); GET `tipo=tabla_destino` (3 senderos
     Explorador/Critico/Organizador con fama derivada de xp_ganado + mapas
     tematicos, niveles FAMA_TIERS por lectura, `patrocinios: []`); POST
     `tipo=review_voto` (upvote util, dedup PK usuario_id+resena_id -> 409,
     403 self-vote, 404 resena inexistente, 503 si migracion 007 pendiente);
     3 misiones nuevas (`mis_own_spot_bogota` +75, `mis_gran_arquitecto`
     +50, `mis_itinerario_perfeccion` +60 con condicion pragmatica: >=4
     visitas a destinos con tags.itinerario) y 3 logros nuevos
     (`logr_spot_domado` +50, `logr_especialista_gastro` +40,
     `logr_cazador_rarezas` +100 con rareza global <5%) -> LOGROS 19.
  2. `api/usuarios.js`: NIVELES 6 -> 15 (umbrales 0/100/250/450/700/1000/
     1400/1900/2500/3200/4000/5000/6500/8500/11000) en 3 Eras
     (Mundano/Patrocinado/Organizador).
  3. `api/pagina-destino.js`: query `spotLider` bajo demanda (try/catch ->
     null si migracion 007 no corrio) + bloque HTML "Lider del spot" en
     secResenas (solo categorias != blog) + 8vo parametro opcional
     `spotLider` en `buildHTML`.
  4. `index.html`, `mi-perfil.html`, `comunidad.html`: XP_LEVELS 15;
     XP_BADGES sin los 5 badges muertos (caribe/andino/compartido/
     plan_maestro/social); mi-perfil anade seccion "Tabla de Destino" con
     arbol SVG y corrige `rareza_global` -> `rareza_pct` y el contador
     desbloqueados/total (19).
  5. `db/migrations/007_milestones_v2.sql` (nuevo): `interacciones.votos_utiles`
     + indice parcial, tabla `resena_votos` (PK usuario_id+resena_id),
     `usuarios.patrocinios jsonb`. Idempotente IF NOT EXISTS.
     PENDIENTE de aplicar en Neon (lo ejecuta Javier en la consola).
  6. `scripts/smoke_test_milestones_v2.js` (nuevo) y
     `scripts/test_logros_catalogo.js` (actualizado a 19 trofeos).
  Spec: `docs/superpowers/specs/2026-09-07-milestones-v2-gaming-design.md`.
  ADR: DECISIONS.md ADR-014 (el codigo lo referencia como "ADR-013" en
  comentarios; ver nota de numeracion en el ADR).
- **Evidencia:** `scripts/smoke_test_milestones_v2.js` 28 checks PASS
  (ejecutado localmente: NIVELES 15 con umbrales del prompt, tabla_destino
  con 3 senderos + fama organizador = mapas*40 + destinos*5, patrocinios [],
  review_voto 400 sin usuario_id, Own the Spot degrada a false sin migracion
  007, bloque "Lider del spot" presente/con hint x1.1/ausente sin lider/
  ausente en blog, balance de divs 95/95). `scripts/test_logros_catalogo.js`
  12/12 PASS (19 trofeos: 6 general + 5 conteo + 5 ciudad + 3 Milestones v2,
  ids unicos, shape, tiers, DAG, Promise, CIUDAD_NORM, 5 ciudades). Escudo
  GOLD: node --check 5/5; ASCII-safety 0 bytes >127 en api/*.js (1
  doble-escape preexistente confirmado en pagina-destino.js:1791 que NO es
  de esta tarea); smokes 4/4. QA-auditor: veredicto RECOMENDACION con
  hallazgos H-1 (self-vote) y H-2 (escritura silenciosa) YA CORREGIDOS en
  el codigo (403 y 503 respectivamente), H-3 (contador 16 -> total)
  corregido en mi-perfil.html, H-4 (GUIA_DE_DESARROLLO.md seccion 7.7)
  corregido.

### TSK-081: Pagina dinamica cinemateca-de-bogota.html (centro cultural de las artes audiovisuales)
- **Estado:** COMPLETADA
- **Detalle:** Pagina de la Cinemateca de Bogota (cat sitio, slug
  `cinemateca-de-bogota`, `status='published'`, `destacado=true`, rating 0).
  Datos investigados por Gemini v2 (ficha JSON) y convertidos al contrato .md
  validado con `validate_ficha.js` (PASS). 4 salas de proyeccion (Sala Capital
  272 personas), BECMA, laboratorios Idartes, 3 secretos (MIDBO, consulta
  gratuita, laboratorios), 3 entradas, 1 tour (rating ''/review_count 0, ADR-009),
  3 equipamiento, 3 itinerario, 3 dificultad_tags, 5 FAQs, fotos reales
  verificadas HEAD 200 (BUG-022). `fauna_flora: ''` (paridad admin: el campo no
  se envia cuando esta vacio; evita seccion fantasma en el renderer). Archivos:
  `scripts/seed-cinemateca-de-bogota.js`, `scripts/load-cinemateca-de-bogota-api.js`,
  `scripts/smoke_test_cinemateca.js` y `exploraco desarrollo/ficha-cinemateca-de-bogota.md`.
- **Evidencia:** Escudo GOLD PASS: node --check OK en los 3 scripts; ASCII-safety
  0 bytes >127 en los 3. Smoke test 13 checks PASS (incluye seccion FAQ via
  det.faqs, degradacion sin seccion fauna con lista vacia, instagram como
  `instagram.com/cinematecabta`) + balance de divs open=258 close=258 diff=0.
  Carga en prod via loader (DELETE+POST Bearer exploraco12345): destino creado
  id 62a1099c-3bbf-43c3-9dcc-a892e67a4f64 status=published destacado=True.
  Verificacion en vivo 2026-09-07: /cinemateca-de-bogota.html = 200 (65KB) con
  las secciones del motor sitio y divs 291/291; /api/destinos lista el slug;
  sitemap.xml incluye el slug (priority 0.80).

### TSK-082: Pagina dinamica centro-cultural-delia-zapata-olivella.html (complejo cultural en La Candelaria)
- **Estado:** COMPLETADA
- **Detalle:** Pagina del Centro Cultural Delia Zapata Olivella (cat sitio,
  slug `centro-cultural-delia-zapata-olivella`, `status='published'`,
  `destacado=true`, rating 0). Complejo estatal de +15.000 m² en La
  Candelaria (Carrera 6 # 5-22, junto al Teatro Colon), extension del Teatro
  Colon/Ministerio de las Culturas. 3 salas (Sala Delia Zapata +400 personas,
  Sala Fanny Mikey caja negra, Ensayadero) + Plaza del Centro. 3 secretos
  (tributo a Delia Zapata, puente patrimonial con Teatro Colon, acustica de
  la Sala Fanny Mikey), 2 entradas, 1 tour (rating ''/review_count 0, ADR-009),
  3 equipamiento, 3 itinerario, 3 dificultad_tags, 5 FAQs. Investigacion de
  Gemini (ficha JSON) convertida al contrato .md validado con
  `validate_ficha.js` (PASS). Fotos reales verificadas HEAD 200 (BUG-022): no
  existe foto del edificio nuevo en Commons, se usaron 5 reales coherentes
  (fachada Teatro Colon 2024 como HERO, interior Teatro Colon, La Candelaria
  desde carrera 4, Plaza de Bolivar 2024, Casa de Delia Zapata Olivella).
  `fauna_flora: ''` (paridad admin). Archivos:
  `scripts/seed-centro-cultural-delia-zapata-olivella.js`,
  `scripts/load-centro-cultural-delia-zapata-olivella-api.js`,
  `scripts/smoke_test_delia_zapata.js` y
  `exploraco desarrollo/ficha-centro-cultural-delia-zapata-olivella.md`.
- **Evidencia:** Escudo GOLD PASS: node --check OK en los 3 scripts;
  ASCII-safety 0 bytes >127 en los 3. Smoke test 13 checks PASS + balance de
  divs open=258 close=258 diff=0. Carga en prod via loader (DELETE+POST Bearer
  exploraco12345): destino creado id 49dfe37c-6c55-471d-830c-c062533286a1
  status=published destacado=True. Verificacion en vivo 2026-09-07:
  /centro-cultural-delia-zapata-olivella.html = 200 (64KB) con las secciones
  del motor sitio y divs 292/292; /api/destinos lista el slug (total 175);
  sitemap.xml incluye el slug.

### TSK-083: Agenda cultural - soporte multidia, vista por dia y categorias claras
- **Estado:** COMPLETADA
- **Detalle:** Rework de la agenda cultural (seccion de `index.html` + pagina
  completa `agenda.html` + conector `index-api-connector.js`) para que un
  evento que dura varios dias (`tags.fecha_inicio` -> `tags.fecha_fin`,
  inclusive) aparezca en TODOS los dias y meses en los que esta vigente.
  Cambios:
  - Nuevo `agenda-shared.js` (raiz, ASCII-safe, IIFE -> `window.AgendaUtil`):
    `normDates`, `evActiveOn` (inicio<=dia<=fin), `evActiveMonths` (cruza de
    mes), `evRangeText` ('12 Sep', '12-13 Sep', '28 Ago - 6 Sep'),
    `detectEventCat` (keywords priorizadas musica/cultura/gastro/naturaleza/
    festival con fold sin tildes) y soporte a recurrentes anuales
    (day/month[/dayEnd/monthEnd]) resueltos al anio consultado.
  - `index.html`: strip por dia con navegacion semana anterior/siguiente +
    boton "Hoy"; los puntos marcan TODOS los dias vigentes; clic en dia filtra
    eventos activos ese dia (dedupe); tarjeta muestra rango + chip "En curso";
    orden cronologico; filtros categoria/ciudad conservan el dia elegido;
    nuevo filtro "🎭 Cultura" (exposiciones/patrimonio/teatro/danza).
  - `agenda.html`: misma logica; el evento aparece en cada mes activo
    (agrupacion por `evActiveMonths`); strip por dia con "Hoy" y dia<->
    (`setDayFilter` limpia el filtro de mes); rango en tarjeta + "En curso";
    nuevo filtro "🎭 Cultura"; `loadApiEvents` usa inicio+fin, hora real
    (`d.horario` en `time`) y sede en `loc`.
  - BUG preexistente corregido: `loadApiEvents` usaba `d.nombre`/`d.ciudad`
    (undefined, la API expone `name`/`city`) -> nombres "undefined" en la
    agenda completa. Ahora `d.name`/`d.city` con fallback.
  - Rangos anuales anadidos a festivales hardcodeados: Carnaval (14-17 Feb),
    Feria de las Flores (1-10 Ago), Feria de Cali (25-30 Dic), Festival
    Vallenato (27-30 Abr).
- **Evidencia:** `scripts/smoke_test_agenda.js` 30/30 PASS (multidia antes/
  inicio/medio/fin/despues, cruce de mes Ago+Sep, textos de rango, recurrentes
  anuales, deteccion de categoria). Verificado con datos reales de
  `/api/destinos?cat=evento`: 23/50 eventos activos el 7-sep-2026 (transitos
  3-12 Sep, patrimonio 1-30 Sep, jazz expandido 4-27 Sep, guaduas 4-11 Sep,
  medejazz 5-19 Sep, teatro libre 31 Ago - 7 Sep); ulibro aparece en Ago+Sep
  y NO el 7 sep (termina el 6); categorias detectadas 50 eventos = musica 15,
  cultura 11, festival 20, naturaleza 2, gastro 2. node --check OK en
  agenda-shared.js / index-api-connector.js / smoke_test_agenda.js; parse de
  scripts inline de index.html y agenda.html OK; ASCII 0 bytes >127 en
  agenda-shared.js.

### TSK-084: Agenda cultural - tarjetas de evento sin doble enlace
- **Estado:** COMPLETADA
- **Detalle:** En `agenda.html` cada tarjeta de evento era un `<a>` al evento
  que ademas contenía OTRO `<a class="ev-link-btn">Ver detalles →</a>` con la
  misma URL (HTML anidado inválido: el navegador cierra el enlace externo y se
  renderizaban DOS bloques clicables -> "una tarjeta y otra que dice ver
  detalles", ambas al mismo evento). En `index.html` ocurría lo mismo con un
  `<button class="ag-ev-action">` dentro del `<a>`. Cambios:
  - `agenda.html` `evCard()`: se elimina el `<a>` interno; la tarjeta queda
    como un único `<a class="ev-card">`. El CTA pasa a `<span class="ev-cta">`
    no interactivo (affordance dorado + micro-interacción
    `.ev-card:hover .ev-cta` translateX). "Próximamente" queda como
    `<span class="ev-cta external">` informativo.
  - `index.html` `renderAgenda()`: el `<button>` pasa a `<span class="ag-ev-cta">`
    (variantes gold/outline, sin cursor:pointer, sin stopPropagation);
    hover de la tarjeta desplaza la flecha.
- **Evidencia:** parse de scripts inline de index.html y agenda.html OK (vm);
  sin referencias residuales a `.ev-link-btn`/`.ag-ev-action`; smoke
  `scripts/smoke_test_agenda.js` 30/30 PASS (lógica no cambia).

### TSK-085: Ingesta automatizada de eventos a la agenda (CLI + skill)
- **Estado:** COMPLETADA
- **Detalle:** Herramienta para subir eventos a la agenda cultural en lote
  sin escribir seed+loader+smoke por evento. La agenda ya soporta multidia
  (fecha_inicio -> fecha_fin) y categoria auto-detectada. Componentes:
  - `scripts/validate_eventos.js`: valida un array JSON de eventos (slug
    `[a-z0-9-]`, nombre, ciudad, lat/lng != 0,0, fecha_inicio/fecha_fin
    `YYYY-MM-DD` con fin >= inicio, sede, arrays opcionales, tipo_evento
    valido, slugs unicos). `--prod` avisa colisiones y total vs la agenda.
  - `scripts/upload-eventos.js <archivo.json> [URL] [TOKEN] [--dry] [--seed]`:
    idempotente DELETE+POST por slug a `/api/admin-destinos` (Bearer
    `exploraco12345`, default `https://exploraco.vercel.app`); defaults
    `categoria_slug='evento'`, `status='published'`, `destacado=false`
    (override), `fecha_fin`=inicio si falta; `--dry` valida sin subir;
    `--seed` genera `scripts/seed-eventos-<fecha>.js` (upsert `ON CONFLICT
    slug`, faqs en destinos_detalles, fotos en destinos_fotos, ASCII-safe).
  - `eventos/eventos.example.json`: plantilla con schema completo y 2
    ejemplos (1 dia y multidia que cruza mes). `eventos/eventos.json` arranca
    en `[]`.
  - `.opencode/skills/ingest-eventos/SKILL.md`: wrapper de agente (recibir
    eventos -> generar eventos.json -> validar -> subir --seed -> verificar
    en /api/destinos?cat=evento y en la agenda -> docs).
  - `agenda.html`: `?cat=evento&limit=50` -> `limit=200` para que los lotes
    aparezcan completos.
- **Evidencia:** node --check OK en validate_eventos.js y upload-eventos.js;
  ASCII 0 bytes >127 en ambos. validate PASS en eventos.example.json (2) y
  eventos.json (0); FAIL (exit 1) contra payload invalido (9 errores: slug,
  ciudad, 0,0, fechas, tipo_evento, lineup, duplicado). upload `--dry --seed`
  reporta el lote y genera seed valido (node --check OK, ASCII 0) sin tocar
  produccion (el seed de prueba con eventos EJEMPLO se eliminó). agenda.html
  parse OK; smoke_test_agenda.js 30/30 PASS.

### TSK-086: Prompt Gemini para investigacion de eventos (lote -> eventos.json)
- **Estado:** COMPLETADA
- **Detalle:** Prompt maestro hermano del de fichas para investigar LOTES de
  eventos en Google Gemini y obtener directo el JSON de `eventos/eventos.json`.
  - Nuevo `.opencode/skills/gemini-research/prompts/GEMINI_EVENTOS_PROMPT.md`:
    plantilla generica por lote (N eventos, ciudad, rango de fechas, tipos).
    Seccion de fuentes (Portal Bogota, Idartes, SCRD, Visit Bogota,
    TuBoleta/Ticketmaster, webs oficiales; NO Instagram). Reglas: fechas
    `YYYY-MM-DD` con fin >= inicio (multidia), sede, `tipo_evento` obligatorio
    (fuerza festival/musica/gastro/naturaleza/cultura en la agenda),
    coordenadas reales, sin ratings (ADR-009). Entrega: un unico bloque
    ```json ``` con el ARRAY copiable a eventos/eventos.json + seccion
    `## Fuentes` fuera del JSON. Fotos como `fotos_sugeridas[]`
    (`{tema, caption, nombres_archivo_wikimedia:["File:..."], es_hero}`), 1
    hero + galeria, con `foto_hero`/`fotos_galeria` VACIOS en el batch (el
    pipeline resuelve y verifica HEAD 200 por evento, BUG-022).
  - `ingest-eventos/SKILL.md`: FASE A (pasar el prompt a Gemini, guardar el
    bloque en eventos/eventos.json), FASE B (fotos por evento opcional:
    resolver fotos_sugeridas via API Wikimedia y re-subir), FASE C (validar
    --prod -> subir --seed -> verificar -> docs).
  - `eventos/eventos.example.json`: se anaden bloques `fotos_sugeridas` de
    ejemplo a los 2 eventos y faqs de ejemplo.
  - `scripts/validate_eventos.js`: validacion opcional de `fotos_sugeridas`
    (array; caption; nombres `File:...`; exactamente 1 `es_hero` cuando hay
    fotos).
- **Evidencia:** node --check OK y ASCII 0 en validate_eventos.js; validate
  PASS en eventos.example.json (2, con fotos_sugeridas 5/1 hero c/u); FAIL
  (exit 1, 3 errores) contra fotos mal formadas (sin prefijo File: y sin
  es_hero); upload --dry ignora fotos_sugeridas y reporta el lote;
  smoke_test_agenda.js 30/30 PASS.

### TSK-087: Lote real de 11 eventos subido a la agenda desde Gemini
- **Estado:** COMPLETADA
- **Detalle:** Primera ingesta real end-to-end: el usuario pego el prompt
  `GEMINI_EVENTOS_PROMPT.md` en Gemini, guardo el JSON en
  `eventos/eventos.json` y se subio a produccion con el pipeline de TSK-085.
  Lote: 11 eventos de Bogota para septiembre 2026 (feria gastronomica
  Sabores de Bogota 11-13 Sep [gastro, destacado], jazz fusion en Movistar
  Arena 8 Sep [musica], danza contemporanea Teatro Mayor 9-10 Sep [cultura],
  muestra de cine Teatro Gaitan 10-13 Sep [cultura], poesia BibloRed 12-13
  Sep [cultura], musica andina Teatro Colsubsidio 11 Sep [musica], MAMBO 8-13
  Sep [cultura], gala sinfonica Movistar 12 Sep [musica], jornada ambiental
  CEFE Fontanar 13 Sep [naturaleza], festival de piano Teatro Mayor 12-13 Sep
  [musica], feria de diseno Plaza de los Artesanos 11-13 Sep [cultura]).
  Fotos via `fotos_sugeridas` (ignoradas por el batch; FASE B pendiente).
- **Evidencia:** validate_eventos.js --prod PASS (11 validos, 0 colisiones;
  total pasa de 50 a 61 < 200). upload-eventos.js --seed -> 11/11 subidos
  (ids detallados en el log; seed generado `scripts/seed-eventos-2026-09-08.js`,
  node --check OK, ASCII 0). Verificado en prod: /api/destinos?cat=evento
  total 61; paginas 200 (feria-gastronomica-sabores-de-bogota-2026.html,
  muestra-cine-independiente-...html); categorias detectadas correctas
  (gastro/musica/cultura/naturaleza); multidia correcto (MAMBO activo 8,10 y
  13 Sep, no el 14; rango '8-13 Sep'; danza activa 9-10 Sep, no el 11).
- **Fix de pipeline:** `upload-eventos.js` parseaba los flags como posicionales
  (`--seed` se usaba como URL -> 'Failed to parse URL'); ahora los flags no
  desplazan archivo/URL/TOKEN. `validate_eventos.js`/`upload-eventos.js`
  reemplazan `process.exit()` por `process.exitCode` para evitar el crash de
  libuv en Windows tras fetch (exit code anormal -1073740791).
- **FASE B (fotos):** nuevo `scripts/resolver-fotos-eventos.js` (reutilizable)
  que resuelve `fotos_sugeridas` a URLs reales de Wikimedia (thumbs 960px +
  HEAD 200, BUG-022) con fallback por recinto (`tags.sede`). 10/11 eventos con
  fotos reales; solo `concierto-musica-andina-teatro-colsubsidio-2026` queda
  sin foto (no existe foto del recinto en Commons). Se corrigio un match
  incorrecto (jazz/gala apuntaban a un palacio de Madrid) usando las fotos
  reales del Movistar Arena Bogota. Re-subidos 11/11 (DELETE+POST) y seed
  `scripts/seed-eventos-2026-09-08.js` regenerado (node --check OK, ASCII 0).

### TSK-088: Conector Hostal Terraza -> agenda (extraccion automatica)
- **Estado:** COMPLETADA
- **Detalle:** Nuevo `scripts/extraer-hostalterraza.js` que lee los eventos
  publicados de https://hostalterraza.vercel.app (tabla Supabase `eventos`,
  RLS anon de lectura publica, misma key que el sitio) y los fusiona en
  `eventos/eventos.json` con slug prefijo `ht-`. Filtros: solo proximos
  (fecha >= hoy), sin pruebas/demos, sin campanas (la binacional no tiene
  sede local; flag `--incluir-campanas`). Coordenadas via Nominatim (fragmento
  de calle + bounding box de Bogota para evitar matches errados como Fontibon);
  foto via `content.poster_url`/`imagen_url` con HEAD 200 (BUG-022). Mapeo:
  `tipo_evento` fiesta->musica, cine/cinematografia->cultura, campana->cultura,
  sin categoria->festival; `lineup` de `content.dj_lineup`, `categorias_entrada`
  de `content.boletos` (Preventa/Taquilla), `faqs` de `content.faq`; `web` al
  evento original. Salida: `eventos/hostalterraza.json` (lote normalizado) +
  fusion (reemplaza ht-* previos, conserva el resto). Flags: `--dry`.
  `ingest-eventos/SKILL.md` actualizado con FASE A2 (fuente externa).
- **Evidencia:** extraccion real -> 2 eventos `ht-*`:
  `ht-afromango-fest-kouj` (Afromango fest, 2026-09-11, musica, sede Calle 19
  #4-20 La casa del oso, lat 4.6044/-74.0696, foto i.ibb.co) y
  `ht-salsa-flow-nt65` (Tropilove, 2026-09-12, musica, sede calle 12B #5-07
  R10, lat 4.5988/-74.0727, foto i.ibb.co). validate_eventos.js --prod PASS
  (13 validos; los 11 previos se re-suben idempotente). upload-eventos.js
  --seed -> 13/13 subidos (total eventos prod 63). Paginas
  ht-afromango-fest-kouj.html y ht-salsa-flow-nt65.html = 200 con foto.
  node --check OK y ASCII 0 en extraer-hostalterraza.js.

### TSK-089: Comunidad social real - chat y planes con gaming completo
- **Estado:** COMPLETADA (implementado y verificado localmente 2026-09-08;
  pendiente migracion 008 en Neon + deploy)
- **Detalle:** Rediseno del apartado social de comunidad.html (tabs Chat y
  Planes) conectado al backend real de Neon, con gaming completo (XP,
  misiones, logros). Respuestas de calibracion de Javier: (1) XP de chat
  +2 por mensaje con tope diario de 20 XP (anti-farming en
  `usuarios.progreso_social`); (2) crear plan gateado por el chat
  desbloqueado (nivel 3 / 250 XP), unirse es libre para registrados;
  (3) sin sesion = chat y planes bloqueados con CTA de login (se elimina
  el demo local de ambos tabs; Ranking conserva su fallback).
  Cambios:
  1. `db/migrations/008_comunidad_social.sql` (nuevo): `chat_salas`
     (con seed idempotente de 6 salas del sistema, emojis `E'\U...'`),
     `chat_mensajes` (moderacion por fijado/activo soft-delete),
     `planes_viaje` + `planes_miembros` (PK compuesta), `usuarios +
     progreso_social jsonb`. Idempotente (ADR-008), ASCII 0.
  2. `api/interacciones.js`: helpers `misionCompletada`/`chatXpDisponible`/
     `registrarChatXp`; GET `chat_salas`, `chat_mensajes`, `planes`,
     `planes_mios`; POST `chat_sala` (gate crear_chat), `chat_msg` (gate
     chat, +2 XP tope 20/dia), `chat_mod` (gate moderador_chat: fijar/
     eliminar), `plan_crear` (gate chat, valida destino/cupos 1-50),
     `plan_unirse` (dedup 409, 403 plan propio, 409 lleno), `plan_salir`;
     MISIONES +3 (mis_chat_activo +20, mis_plan_creador +25,
     mis_plan_unido +15); LOGROS +3 (logr_social_chat +30,
     logr_social_plan +35, logr_anfitrion +50) -> LOGROS 22. Sin endpoint
     nuevo (presupuesto 8/8, ADR-010).
  3. `comunidad.html`: tabs Chat/Planes consumen la API (polling 5s,
     sin websockets en Hobby), envio optimista + XP toast, moderacion
     condicional, formulario de plan (no `prompt`), fix XSS (`esc()` en
     todo texto de usuario). Div balance 86/86.
  4. `scripts/test_logros_catalogo.js` (19 -> 22) y
     `scripts/smoke_test_comunidad.js` (nuevo, 30 checks).
- **Evidencia:** `node --check api/interacciones.js` OK; ASCII 0 bytes
  >127 y 0 backticks; `test_logros_catalogo.js` 12/12 PASS (LOGROS 22);
  `smoke_test_comunidad.js` 30/30 PASS (catalogo, 4 GET, 6 POST
  registrados, gates 403, anti-farming); divs comunidad 86/86.
  Espec: `docs/superpowers/specs/2026-09-08-comunidad-chat-planes-
  backend-design.md`; ADR-015 en DECISIONS.md. Pendiente BLOQUEANTE:
  aplicar la migracion 008 en Neon antes del deploy.
  APLICACION DE LA MIGRACION: exclusivamente en el **editor SQL de Neon**.
  Los runners locales que exigen result set por sentencia fallan con las
  sentencias DDL (`result.rows` undefined -> error "Cannot read properties
  of undefined (reading 'map')"). Es idempotente; re-ejecutar el archivo
  completo es seguro tras un fallo parcial.

### TSK-090: Subcategorias en tags (ADR-016) - implementacion Fase 1-3 en working tree
- **Estado:** EN PROGRESO (implementacion Fase 1-3 lista local 2026-09-10,
  sin commitear; pendiente commit/deploy + ejecutar reclasificacion en
  produccion con DATABASE_URL y aprobacion de Javier + verificacion pre/post)
- **Detalle:** Alcance REAL ejecutado del ADR-016 (verificado contra archivo
  ADR-006):
  1. `admin.html`: 3 selects `f-subcategoria-*` (sitio L1321 con onchange
     `applySubcategoriaSitio()`, comida L1182, evento L1496) registrados en
     `CATEGORY_TAG_FIELDS.<cat>` (L2591/2632/2646); visibilidad condicional de
     sub-tabs `especifico-sitio` via `SITIO_ALL_TABS` (L4474) +
     `applySubcategoriaSitio()` (L4475). Balance divs 0 (653/653).
  2. `api/pagina-destino.js`: `SUBCAT_LABEL` (21 labels, L20-28),
     `SITIO_SECCIONES_POR_SUBCATEGORIA` (L42-52), chip `.subcat-chip` en el
     hero (L2007-2008, CSS scoped L175), gating `subcatActiva()` (L1461) sobre
     8 secciones legacy (dificultad, entradas, tours, checklist, itinerario,
     fauna, secretos, regulaciones) + 13 secciones nuevas condicionales
     (colecciones, recorridos, accesibilidad, programacion, musica_vivo, cover,
     codigo_vestimenta, happy_hour, atracciones, horarios_zona,
     actividades_gratis, que_ver, contexto). H1: `cover` se lee como objeto
     `{valor, nota}` con fallback a `cover_valor`/`cover_nota` planos legacy
     (L599-601). H2: las 13 nuevas usan `subcatActiva()`. Fallback sin
     subcategoria = render legacy intacto (L611-614, regresion cero).
  3. `api/publicar-lugar.js`: `SUBCAT_LISTA` (L29-33) valida contra la lista
     cerrada de la categoria final y solo persiste si matchea (L104-107).
  4. `publicar.html`: 3 selects (L250/267/280) con show/hide por chip
     (L829-833), `subcatResumen()` (L963-965), payload `subcategoria` (L1076).
  5. `.opencode/skills/gemini-research/scripts/validate_ficha.js`:
     `SUBCATEGORIAS` (L46-58), validacion backward-compatible (ausencia de
     subcategoria NO es error, L114-122).
  6. `scripts/reclasificar-subcategorias.js` (NUEVO): idempotente,
     `--dry-run` (default) / `--apply` / `--local`, merge JSONB (ADR-003),
     inferencia keyword->subcategoria (tipo_actividad > nombre > lead, orden
     especifico->generico, NFD + limites de palabra), log en
     `scripts/logs/reclasificar-subcategorias-2026-09-10.log`.
- **Evidencia:** dry-run local sobre 84 seeds: 74 inferidos, 10 sin-match
  (candelario + 9 eventos multiformato), 0 skipped (resumen
  `total=84 asignar=74 aplicado=0 skip=0 sin_match=10 modo=dry-run`).
  ADR-016 en DECISIONS.md (Estado actualizado a Fase 1-3 completada).
  Pendiente: (a) commit + push del working tree; (b) revisar los 10 sin-match
  con Javier; (c) aplicar reclasificacion en produccion
  (`DATABASE_URL=... node scripts/reclasificar-subcategorias.js --apply`);
  (d) Escudo GOLD + smoke de buildHTML() de las 3 categorias con y sin
  subcategoria antes de cerrar.

---

### TSK-091: Pagina dinamica bahia-malaga.html (PNN Uramba Bahia Malaga)
- **Estado:** COMPLETADA (2026-09-09)
- **Detalle:** Pagina del Parque Nacional Natural Uramba Bahia Malaga (cat
  sitio, slug `bahia-malaga`, `status='published'`, `destacado=true`,
  rating 0) con datos del PNN: 47.094 hectareas en Buenaventura (Valle del
  Cauca), santuario de la ballena jorobada (Megaptera novaeangliae) entre
  julio y octubre, manglares, esteros y cascada La Sierpe, comunidades
  afrodescendientes de Juanchaco/Ladrilleros/La Plata/Puerto Chiple.
  Coordenadas 3.9333, -77.35. TASA muelle $20.000 COP + tours desde
  $70.000-80.000 COP. Fuente: ficha-bahia-malaga.json (ficha completa,
  sin re-investigacion). Archivos: `scripts/seed-bahia-malaga.js`
  (upsert ON CONFLICT slug, modo `--dry`, ASCII-safe 0/0/0),
  `scripts/load-bahia-malaga-api.js` (DELETE+POST Bearer exploraco12345)
  y `scripts/smoke_test_bahia_malaga.js` (buildHTML en sandbox vm).
  Fotos: las 10 URLs de FOTOS_SUGERIDAS de la ficha daban `missing` en
  Wikimedia Commons -> se resolvieron 5 reales verificadas HEAD 200
  (BUG-022): HERO "Ballena jorobada y ballenato en Bahia Malaga" (la unica
  foto georeferenciada del parque en Commons), ballena jorobada yubarta,
  manglar del Pacifico colombiano, calle de Juanchaco y playa de
  Juanchaco. FAQS 5. Rating 0 (ADR-009, sin resenas sembradas).
- **Evidencia (Escudo GOLD):** `node --check` PASS en los 3 archivos;
  ASCII-safety 0 bytes >127 / 0 dobles escapes / 0 backticks en los 3;
  smoke `scripts/smoke_test_bahia_malaga.js` 15/15 PASS con balance de
  divs 361/361. Carga en prod via loader: POST /api/admin-destinos = OK
  (id 1d233452-9728-4e90-be80-f5b611337129, status published, destacado
  true). GET /bahia-malaga.html = 200 (79.763 bytes) con las 9 secciones
  del motor sitio (entradas, tours, fauna, secretos, itinerario,
  checklist, faq, galeria, mapa); /api/destinos?categoria=sitio lista el
  slug (name "Parque Nacional Natural Uramba Bahia Malaga", rating 0,
  total sitio 74); sitemap.xml incluye el slug (HTTP 200).

---

### TSK-092: Sistema de Albums Fotograficos [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-09; pendiente migracion 009 en Neon + deploy, segun header de api/interacciones.js v8)
- **Prioridad:** Alta
- **Fecha:** 2026-09-09
- **ADR:** ADR-017
- **Archivos modificados:**
  - db/migrations/009_albumes.sql (NUEVO)
  - api/interacciones.js v7 -> v8 (+604 lineas)
  - admin.html (+99 lineas)
  - comunidad.html (+136 lineas)
  - mi-perfil.html (+190 lineas)
  - api/pagina-destino.js (foto destacada ADR-017 P11)

- **Subtareas completadas:**
  1. Migracion SQL 009_albumes.sql (3 tablas + 1 columna + 6 indices)
  2. Backend: 5 GET + 8 POST + 6 misiones + 7 logros
  3. Admin: Foto Top + Moderacion
  4. Mapa audiovisual en comunidad.html (Leaflet + MarkerCluster)
  5. Mis Albumes en mi-perfil.html (grid + modales)
  6. Foto destacada en pagina-destino.js
  7. Tests actualizados
  8. Documentacion (ADR-017)

- **Nota de cierre (ADR-006, verificado contra archivo real):** la migracion
  `db/migrations/009_albumes.sql` existe en el repo; `api/interacciones.js`
  es v8 (header "Albums ADR-017: +6 misiones, +7 logros, +5 GET (albumes,
  album_detalle, multimedia_mapa, mi_feed_fotos, fotos_top), +8 POST
  (album_crear, album_agregar_foto, album_voto, album_quitar_foto,
  album_editar, album_eliminar, admin_foto_top, admin_moderar_foto_album)")
  y declara "Requiere migracion 009_albumes.sql antes de desplegar";
  admin.html tiene la seccion Foto Top del Destino + adminModerarFotoAlbum;
  comunidad.html tiene el tab Mapa (`#cpanel-mapa`, fix z-index Leaflet,
  GET `tipo=multimedia_mapa`); mi-perfil.html tiene "Mis Albumes" con
  modales crear/detalle; api/pagina-destino.js tiene la foto destacada
  (ADR-017, P11).

- **Pendiente para V2:**
  - Visibilidad public/unlisted/privado de albumes
  - Boton "Reportar" para fotos ofensivas
  - Upload real (Cloudinary/R2)
  - Busqueda de albumes

---

### TSK-093: Capa multimedia + drawer del mapa cultural [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-10; requiere deploy de api/interacciones.js con fix UNION, ver BUG-030)
- **Prioridad:** Alta
- **Fecha:** 2026-09-10
- **Spec:** docs/superpowers/specs/2026-09-10-multimedia-mapa-cultural-drawer.md
- **Archivos modificados:**
  - index.html (capa multimedia Leaflet + drawer lateral fijo)
  - index-api-connector.js (toMapPlace foto/photos + bloque MAPA_MEDIA)
  - api/interacciones.js (fix UNION types de multimedia_mapa, BUG-030)

- **Subtareas completadas:**
  1. Capa de pines multimedia en el mapa Leaflet de index.html
     (foto/video/audio con divIcon de colores y toggle por tipo)
  2. Drawer lateral fijo con datos del destino (foto hero, rating, precio,
     lead, link) + tabs Fotos/Videos/Audios con lightbox, embed de
     YouTube/Vimeo y player de audio
  3. index-api-connector.js propaga `foto` y `photos[]` en `toMapPlace()`
     y puebla `MAPA_MEDIA[]` desde el endpoint publico
     GET /api/interacciones?tipo=multimedia_mapa
  4. Fix UNION types en api/interacciones.js (BUG-030): `a.id::text AS
     origen_id` en la rama de albumes

- **Nota de cierre (ADR-006, verificado contra archivo real):** index.html
  tiene `MAPA_MEDIA` (L1514) y el filtro `MAPA_MEDIA_TIPO` (L1516) con
  re-sync de la capa multimedia (L2636); index-api-connector.js
  `toMapPlace()` (L72) emite `foto` (L88, `item.foto_hero || item.foto`)
  y `photos[]` (L92, slice 8), y el bloque 3b (L256-276) consume el
  endpoint publico y puebla `MAPA_MEDIA` via `replArr` (L271);
  api/interacciones.js en el UNION ALL de `multimedia_mapa` castea
  `a.id::text AS origen_id` (L1484) frente a `d.slug AS origen_id`
  (L1496); la spec del drawer existe en
  docs/superpowers/specs/2026-09-10-multimedia-mapa-cultural-drawer.md.

- **Pendiente:**
  - Deploy de api/interacciones.js (fix UNION) y verificacion en
    produccion de la capa multimedia y el drawer

---

### TSK-094: Gamificacion v4.0 -- consumibles, economia de XP, 20 niveles, cromos y pandillas [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-10; pendiente aplicar migracion 010 en Neon + deploy)
- **Prioridad:** Alta
- **Fecha:** 2026-09-10
- **ADR:** ADR-018
- **Spec:** docs/superpowers/specs/2026-09-10-gamificacion-v4-design.md
- **Prompt origen:** prompt gamming.txt (respuestas de Javier: 10 consumibles, 20 niveles confirmados, de-nivel con revocacion, cromos/pandillas completos, precios editables desde admin)

- **Archivos modificados:**
  - db/migrations/010_gamificacion_v4.sql (NUEVO, 9 tablas + ALTER + seed)
  - docs/superpowers/specs/2026-09-10-gamificacion-v4-design.md (NUEVO)
  - api/interacciones.js (v8 -> v9: +5 GET, +8 POST, tabla_destino 5 senderos, retos de parche)
  - api/usuarios.js (NIVELES 20 + BUG-1 conMisiones merge + calcularEra)
  - api/admin.js (+4 endpoints CRUD consumibles)
  - admin.html (screen Consumibles con precios editables)
  - mi-perfil.html (vitrina 20 niveles + Tienda/Inventario/Mis Cromos)
  - comunidad.html (tab Pandillas + retos)
  - index.html (XP_LEVELS 20)
  - usuario-session.js (gastarXp + CAPACIDADES_POR_NIVEL + XP_LEVELS 20)
  - scripts/smoke_test_gamificacion_v4.js (NUEVO)
  - scripts/smoke_test_perfil_progreso.js, smoke_test_milestones_v2.js, smoke_test_comunidad.js, verify_comunidad_prod.js (conteos stale corregidos)

- **Subtareas completadas:**
  1. Spec tecnica v4.0 + revision arquitectonica (2 bugs bloqueantes detectados y corregidos)
  2. Migracion 010 (consumibles, ledgers, cromos, pandillas, retos, cromo_intercambios)
  3. Backend v9 (economia de XP con de-nivel, cromos probabilisticos, pandillas completas)
  4. Admin: CRUD de consumibles con precios editables
  5. Frontend: vitrina 20 niveles, tienda/inventario, cromos, pandillas
  6. Smokes oficiales (95/95) + correccion de regresiones
  7. ADR-018 + docs

- **Verificacion:** Escudo GOLD node --check 4/4; ASCII-safety 0 bytes >127 en api/*.js; smoke_test_gamificacion_v4.js 95/95 PASS; smokes de regresion OK.

- **Pendiente (BLOQUEANTE):** aplicar db/migrations/010_gamificacion_v4.sql en Neon (Javier) + commit/deploy y verificacion en vivo.

---

### TSK-095: Refactor UI/UX ficha de destino (prompt cambios.txt) -- verificado admin, hero HQI, popover Guardar y galeria con lightbox [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-11)
- **Prioridad:** Alta
- **Fecha:** 2026-09-11
- **Prompt origen:** `prompt cambios.txt` (requerimientos UI/UX de la ficha dinamica + sistema de verificado manual admin)
- **Archivos modificados (3, Escudo GOLD LIMPIO):**
  - api/pagina-destino.js (motor de render de la ficha)
  - admin.html (checkbox `f-verificado` + wiring completo, divs 716/716)
  - api/admin-destinos.js (columna `verificado` gestionada, patron de `destacado`)

- **Subtareas completadas:**
  1. **Hero HQI (remueve TSK-075):** se eliminan los chips de resenas, precio "desde", duracion y del link web (este se centraliza en la botonera); se agrega chip de direccion fisica con fallback `d.address || d.barrio` (L764); se conservan ciudad/region y horario.
  2. **Seccion "Sobre este lugar":** se elimina el `slead` (el lead se mantiene solo en el hero); nuevo subtitulo estilizado `.sintro` (CSS L231, borde dorado + italica) con apertura de la descripcion (150 chars, fallback a highlight, solo no-blog) (L801).
  3. **Botonera hero:** Sitio Web y Contactar como unicos prominentes (`hbtn`); Como llegar, Ver galeria, Guardar y Estuve aqui en secundario (`hobtn`).
  4. **Boton Guardar -> popover `abrirPopoverGuardar()`** (L2257): seleccion "Tu Mapa" (`toggleGuardado`), checkboxes de mapas tematicos del usuario (`mapas_mios` + `mapa_detalle`) y crear nuevo mapa (`mapa_crear` + `mapa_agregar_destino`, L2301). Reutiliza la API existente de /api/interacciones (sin endpoints nuevos).
  5. **Franja naranja (gstrip):** conserva resenas y precio desde; ELIMINADO el boton "Reservar" (comentario L781-782; la reserva vive en secReservar); agregado boton "Ver galeria" con scroll directo a `#galeria` (L783, condicion `galAll.length > 1`).
  6. **Galeria:** foto principal grande `.gal-main` (L1484, click abre lightbox) + miniaturas `.gal-thumbs` (L1485) + boton "Ver galeria ampliada" (L1486) + **Lightbox** `#lb` (L1493) con navegacion prev/next, teclado (Esc/flechas) y cierre por fondo.
  7. **secMapa:** SOLO boton Google Maps (se eliminan WhatsApp y Telefono de ese bloque, comentario L1755-1756).
  8. **Limpieza de modulos:** eliminado el modulo inferior "Foto destacada" (`secFotoDestacada`, era ADR-017/P11; comentario L1936) y eliminado el boton Google Maps del bloque secContact (queda centralizado en secMapa, comentario L1941-1942).
  9. **Sin insignia publica de verificado:** por decision, el renderer NO emite ninguna insignia publica del campo `verificado` (0 ocurrencias de `verificado` en api/pagina-destino.js); es control interno del admin. Ver DECISIONS.md ADR-019.
  10. **admin.html:** nuevo checkbox `f-verificado` "Verificacion manual admin" en pestana General (L795-797) + wiring completo: clearForm (L2548-2549 `cbVer.checked=false`), loadForm (L2988-2989 `cbVer.checked = !!(p.verificado)`), savePlace (L3629-3630 `p.verificado = !!(cbVer && cbVer.checked)`), `_placeToAPI` (`verificado: p.verificado === true`, L5828) y `_mergeNeonRowIntoLocal` (L6145 con guard `!== undefined && !== null`).
  11. **api/admin-destinos.js:** `verificado` como COLUMNA gestionada con el patron identico a `destacado`: GET listado la incluye (L63), INSERT (L109/157 con `Boolean(b.verificado||false)`) y UPDATE con guard `b.verificado !== undefined` que permite persistir `false` y DESTILDAR (L256-258). La columna ya existia en Neon (la usan publicar-lugar.js y destinos.js).
  12. **ADR-019** en DECISIONS.md + NEXT.md con el backlog de hallazgos del QA.

- **Verificacion (Escudo GOLD):** `node --check` limpio en api/pagina-destino.js y api/admin-destinos.js; ASCII-safety 0 caracteres no-ASCII nuevos en los 3 (1 doble escape preexistente confirmado ~L2174 de addRvOptimista, NO de esta tarea; ver backlog en NEXT.md); balance de divs de admin.html 716/716 (delta 0, re-verificado contra archivo real ADR-006); smoke del renderer 28/28 PASS; flujo de verificado 6/6 PASS (checkbox admin -> INSERT/UPDATE de admin-destinos.js -> GET listado -> merge _mergeNeonRowIntoLocal, incluyendo desmarcar con UPDATE `false`).

- **Cierre de backlog (2026-09-11, verificacion exp-pickle 14/14 PASS):**
  - **`address` PERSISTIDA (cierra el riesgo activo 1 de NEXT.md):** `admin.html` `_placeToAPI` envia `address` en POST y PUT (L5807); `api/admin-destinos.js` INSERT persiste la columna (L103 columnas, `$10` en L114, L137 valores) y el fieldMap del UPDATE la incluye (L220); `api/pagina-destino.js` L764 sigue leyendo `d.address || d.barrio` (sin cambios). Columna lista via migracion `db/migrations/011_ficha_direccion_destinos.sql` (`ALTER TABLE destinos ADD COLUMN IF NOT EXISTS address TEXT;`, idempotente, patron ADR-008) -- PENDIENTE de APLICARSE en el editor SQL de Neon manualmente (NO pendiente de implementarse).
  - **Gate de la seccion "Reservar" DECIDIDO e implementado (ADR-020):** `secReservar` SOLO se renderiza cuando el destino tiene enlace real de Booking.com o Hostelworld (`bookingUrl || hwUrl`, api/pagina-destino.js L1747). El WhatsApp solo y el Airbnb solo ya no disparan la seccion (los sitios ya no muestran "Reservar" sobrante); WhatsApp y contacto siguen vivos via hero y secContact.
  - **Insignia publica de verificado: NO** (decidido; coherente con ADR-019 -- solo control interno del admin + columna, sin render publico).
  - **Estado final de la TSK-095:** implementada; pasos manuales pendientes = (1) HOTFIX BUG-031 en produccion (commit+push+redeploy del fix del JS inline del popover, ver bullet abajo -- TSK-095 YA desplegada CON el bug, produccion rota), (2) aplicar la migracion 011 en Neon + commit/push manual del usuario.
  - **BUG-031 (detectado post-deploy, corregido en codigo, PENDIENTE deploy manual):** el popover de Guardar de la TSK-095 (subtarea 4) llego a produccion con el JS inline de buildHTML() roto: el onchange de los checkboxes de mapas tematicos se ensamblaba en 3 lineas (L2288-2290) con comilla escapada mal formada (`\\\'` dentro de string single-quoted) -> `SyntaxError: Unexpected token` en la linea 126 del JS inline generado -> TODAS las paginas dinamicas sin funciones de cliente (`abrirPopoverGuardar is not defined`, Estuve aqui, submitRv, votarDID, lightbox; confirmado local 5 categorias y prod 4 paginas). Reportado por usuario en /parque-mundo-aventura.html. FIX en working tree SIN commitear: L2288-2290 colapsadas en 1 sola con entidad HTML `&#39;` (cliente queda `toggleMapaDest('ID',this.checked)`) + guard permanente `scripts/check_buildHTML_inline.js` (parsea con vm.Script todo inline de buildHTML: 8 funciones criticas + JSON-LD + divs; exit 0/1/2). Verificado: node --check PASS, ASCII 0/0/0, smoke parque 14/14, check inline 3 categorias 8/8, divs 364/364. Detalle completo: BUGS_HISTORICOS.md BUG-031; Escudo GOLD debe incluir `node scripts/check_buildHTML_inline.js`.
  - **Sigue abierto (higiene menor, NO bloqueante):** doble escape preexistente ~L2174 en `addRvOptimista` (ver backlog en NEXT.md, punto 3) y BUG-027 (boton Instagram en secContact).
  - **Nota posterior (TSK-105 / ADR-030, 2026-09-16):** las menciones a `secMapa` de las subtareas 7 y 8 quedaron OBSOLETAS: `secMapa` (id="mapa") se FUSIONO con `secTransporteHostal` en `secComoLlegar` (id="como-llegar", transporte arriba + mapa abajo), con una sola entrada de subnav `como-llegar` y un ancla legacy invisible `#mapa`. El texto historico se conserva por Cero Borrado Logico (Regla de Oro 3); el estado vigente esta en TSK-105 y BLUEPRINT.md seccion 5.

---

### TSK-096: Capa audiovisual estricta y paridad de drawer en el mapa cultural (prompt cambios.txt) [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-12)
- **Prioridad:** Alta
- **Fecha:** 2026-09-12
- **Prompt origen:** `prompt cambios.txt` (requerimientos de capa audiovisual, filtros del mapa y paridad de popups/drawers)
- **Archivos modificados (4, Escudo GOLD limpio):**
  - api/interacciones.js (query param `origen` en el handler `multimedia_mapa`)
  - index-api-connector.js (fetch con `&origen=album`)
  - index.html (filtros deseleccionables, capa estricta y paridad de drawer)
  - mapas.html (drawer lateral propio en el mapa de detalle)

- **Decisiones de producto (respuestas del usuario):**
  1. Capa audiovisual estricta: mejor opcion = filtro en backend (param opcional) + filtro defensivo frontend.
  2. Sin toggle on/off: la deseleccion de "Todo" oculta todos los pines del directorio.
  3. Se elimina el popup de los pines individuales y se deja el drawer.
  4. Alcance "a los 2": ademas del mapa cultural, aplicar la paridad a "Mi Mapa personal" y a `mapas.html`.

- **Subtareas completadas:**
  1. **Backend (api/interacciones.js):** nuevo `var mmOrigen = req.query.origen || null;` (L1712); la rama estatica se anula con `((mmTipo && mmTipo !== 'foto') || mmOrigen === 'album' ? ' AND FALSE' : '')` (L1739). Sin `origen` la respuesta es identica a la anterior (retrocompatible con comunidad.html L1221). Sin parametros SQL nuevos ni migracion.
  2. **Connector (index-api-connector.js):** el fetch de multimedia_mapa pide `&origen=album` (L258).
  3. **Capa estricta (index.html):** `renderMapaMedia()` y `mdMediasCercanas()` descartan `origen === 'destino'`; la capa solo pinta albumes de usuarios. El branch defensivo `origen==='destino'` de `openMapaMediaDrawer` se conserva.
  4. **Filtro deseleccionable (index.html):** el listener de `.mf-btn[data-cat]` detecta `yaActivo` y deselecciona (`mapaActiveCat='off'`); `filterMapaPins('off')` deja `mapaPlaces=[]` (recluster vacia la capa) y `renderMapaList('off')` muestra estado vacio. "Todo" activa la capa media solo al re-seleccionarse, no al deseleccionar.
  5. **Paridad de drawer (index.html):** eliminado el `bindPopup` de los pines del directorio (`refreshMapaMarkers`) y de "Mi Mapa personal" (`updateMMMarkers`); el clic usa `setMapaActive()` -> `openMapaDrawer(place)`. Se limpio el manejo de popup (`openPopup`, `mapaPendingPopupId`) de `setMapaActive` y `onMapaMoved`. Clusters intactos (zoom + popup de lista).
  6. **mapas.html:** drawer lateral propio (`.dd-wrap`/`.dd-panel`, CSS nuevo acorde a la pagina) + `abrirDrawerDetalle(x)` con hero (`_fotoSrc` valida esquema), badge de categoria (`CAT_LBL`), titulo, ciudad y CTA `/{slug}.html`; cierre por backdrop, boton y Escape; datos escapados con `_esc`.
  7. **ADR-021** en DECISIONS.md + NEXT.md actualizado.

- **Verificacion (Escudo GOLD):** `node --check api/interacciones.js` e `index-api-connector.js` PASS; JS inline extraido de index.html y mapas.html con `node _verify.js` + `node --check` PASS; ASCII-safety: 0 caracteres no-ASCII en lineas nuevas (un comentario CSS se normalizo a ASCII); balance de divs index.html -1 (preexistente en HEAD, sin regresion) y mapas.html 0 (HEAD 0).

- **Auditoria (BUGS_HISTORICOS):** BUG-001 (no-ASCII en api/*.js) no aplica (cambio ASCII); BUG-030 (UNION types uuid/varchar) sin reaparicion (`a.id::text AS origen_id` intacto); BUG-020 (replArr const/window) sin impacto; BUG-031 (JS inline) cubierto por `node --check` del inline extraido. XSS: los drawers escapan datos con `esc()`/`_esc()`.

- **Fuera de alcance / backlog:** la capa multimedia de `comunidad.html` sigue mostrando la rama estatica (no se le agrego `origen=album`); `mapaPendingPopupId`/`mapaPendingClearTimer` quedan declaradas sin uso; pendiente commit/deploy manual.

---

### TSK-097: Fixes multimedia + constraint unica de interacciones (prompt cambios.txt) [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-12)
- **Prioridad:** Alta
- **Fecha:** 2026-09-12
- **Prompt origen:** `prompt cambios.txt` (fixes multimedia + constraint unica de interacciones)
- **Archivos modificados (Escudo GOLD limpio, working tree SIN commitear):**
  - `db/migrations/012_interacciones_dedup_resena_rating.sql` (NUEVO)
  - `api/interacciones.js` (catch 23505 + trazabilidad multimedia_mapa/album_detalle)
  - `api/pagina-destino.js` (BUG-027: icono Instagram)
  - `index.html` (DEST_PHOTOS vacio + `photoPlaceholderHTML` + `openAlbumModal` + balance de divs 497/497)
  - `index-api-connector.js` (confirmado sin URLs externas)
  - `mi-perfil.html` (UI completa de albumes + fix comillas de `quitarFotoAlbum`)
  - `comunidad.html` (reproductor real de audio/video/embed + `abrirAlbumModal`)
  - `admin.html` (moderacion de fotos de album, divs 724/724)
  - `scripts/smoke_auditoria_pagina_destino.js` (NUEVO; 42 checks al cierre de TSK-097, 54 checks HOY tras TSK-105 / ADR-030, 2026-09-16)

- **Fixes completados:**
  1. **FIX 1 - Constraint unica de interacciones (solo resena/rating):** nueva migracion
     `db/migrations/012_interacciones_dedup_resena_rating.sql` que hace DROP de la constraint
     heredada `interacciones_usuario_id_destino_id_tipo_key` y crea el indice unico PARCIAL
     `idx_interacciones_dedup_resena_rating ON interacciones (usuario_id, destino_id)
     WHERE tipo IN ('resena','rating')`, con dedup defensivo (conserva la resena con texto y,
     a igualdad de tipo, la mas reciente; excluye usuario_id NULL) y recalculo de
     `destinos.rating`/`total_resenas` solo para los destinos afectados (patron ADR-007/008,
     idempotente, ASCII-safe). Motivo: los INSERT `tipo='foto'` (upload de foto de lugar) y
     `tipo='foto_voto'` chocaban con la constraint compuesta y devolvian 500; con el indice
     parcial las fotos quedan libres (ADR-017) y el dedup de resena/rating se preserva
     (ADR-007). En `api/interacciones.js` el catch final ahora mapea `err.code === '23505'`
     a 409 tipado (`{ok:false, error:'Registro duplicado', duplicado:true}`, L3451-3452) en
     vez de 500 generico.
  2. **FIX 2 - Fotos reales en index (sin URLs de prueba):** `index.html` dejo
     `var DEST_PHOTOS = {};` (L1781; antes tenia URLs Unsplash de prueba) y agrego el helper
     reutilizable `photoPlaceholderHTML(emoji, variant)` (L2928) con placeholder neutro
     (gradiente + emoji) para destinos sin foto real. `index-api-connector.js` confirmado sin
     URLs externas (solo refiere el placeholder del index). La capa `MAPA_MEDIA` ya era 100%
     real desde ADR-021 (`?tipo=multimedia_mapa&origen=album`). No existia `MOCK_MEDIA`.
  3. **FIX 3 - Albumes en perfil:** `mi-perfil.html` ahora tiene UI completa para crear,
     editar (`album_editar`), eliminar (`album_eliminar`), subir foto (`album_agregar_foto`)
     y quitar foto (`album_quitar_foto`), reutilizando `window.ExploraCO.usuario` como sesion.
  4. **FIX 4 - Trazabilidad de autor/album:** `api/interacciones.js` enriquece
     `multimedia_mapa` (agrega `album_id`, `usuario_id`, `usuario_nombre`, `usuario_avatar`,
     L1673/1724) y `album_detalle` (agrega `usuario_nombre`, `usuario_avatar`, `autor_avatar`,
     `usuario_id` en fotos, L1685). `index.html` (`openAlbumModal` L3321 + drawer) y
     `comunidad.html` (`abrirAlbumModal` L1340) permiten ir de foto -> album y de autor ->
     `/mi-perfil.html?id=...`.
  5. **FIX 5 - Auditoria multimedia:** `api/pagina-destino.js` corrigio BUG-027 (el boton
      Instagram mostraba el literal `[foto]`; ahora `\uD83D\uDCF7`, L1950). Se creo
      `scripts/smoke_auditoria_pagina_destino.js` (42 checks al cierre de TSK-097;
      54 checks HOY tras TSK-105 / ADR-030, 2026-09-16). `comunidad.html` agrego
     reproductor real de audio/video/embed (`avMediaHTML` L1274, `avEmbedUrl` L1264).
     `index.html` corrigio el desbalance de divs (un `</div>` sobrante y uno faltante en
     `publicar-modal`; balance 497/497). `admin.html` conecto la UI de moderacion de fotos
     de album (`adminCargarFeedFotos` -> `mi_feed_fotos` L6056, `adminRetirarFotoAlbum` ->
     `admin_moderar_foto_album` con accion 'eliminar' L6031/6120).

- **Verificacion (Escudo GOLD):** `node --check` limpio en api/interacciones.js y
  api/pagina-destino.js; `node --check index-api-connector.js` limpio; 0 bytes >127 en los
  api/*.js (index-api-connector.js mantiene sus 26 backticks preexistentes, baseline HEAD 26);
  balance de divs 0 en index.html (497/497), comunidad.html (181/181), mi-perfil.html
  (166/166) y admin.html (724/724); JS inline de los 4 HTML parsea con `node --check`;
  `scripts/check_buildHTML_inline.js` -> TODO OK; smokes OK: `smoke_auditoria_pagina_destino.js`
  (42/42 al cierre de TSK-097; 54/54 HOY tras TSK-105 / ADR-030, 2026-09-16),
  `smoke_test_comunidad.js`, `test_logros_catalogo.js` (29) y
  `smoke_test_perfil_progreso.js`. QA manual detecto y se corrigieron 2 bugs de integracion
  nuevos: (a) `openAlbumModal` en index.html leia `res.data` en vez de `res.album`/`res.fotos`;
  (b) `mi-perfil.html` generaba `onclick="quitarFotoAlbum(uuid,uuid)"` sin comillas
  (ReferenceError); ambos corregidos (L3333-3338 y L1121).

- **PENDIENTE BLOQUEANTE (ACTUALIZADO 2026-09-13):** la migracion `db/migrations/012_interacciones_dedup_resena_rating.sql` YA fue aplicada por Javier en Neon (migraciones 011-014 aplicadas el 2026-09-13).
  Pendiente tambien: commit + push + deploy manual del working tree completo (incluye los
  cambios de modelos de agentes, ver NEXT.md) y reiniciar opencode para que tome los modelos
  nuevos de `.opencode/agent/`.

---

### TSK-098: Epic multimedia de usuarios: fix 500 albumes/mapa, filtro multi-seleccion, galeria ampliada, modulo audiovisual y comentarios tipo Facebook [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-12, working tree SIN commitear)
- **Prioridad:** Alta
- **Fecha:** 2026-09-12
- **Prompt origen:** epic multimedia de usuarios (fix 500 en albumes/mapa, filtro multi-seleccion, galeria ampliada, modulo audiovisual y comentarios tipo Facebook)
- **Archivos modificados/nuevos (Escudo GOLD limpio, working tree SIN commitear):**
  - `api/interacciones.js` (COALESCE foto/avatar, catch 42P01/42703 -> 503 `SCHEMA_NOT_MIGRATED`, `multimedia_mapa` con `tipo_media` CSV, `mi_feed_fotos?orden=`, contador `comentarios`, 6 ramas `tipo=` nuevas de comentarios/galeria; SIN endpoints nuevos, presupuesto 8/8 ADR-010)
  - `db/migrations/013_album_comentarios.sql` (NUEVO, ADR-023)
  - `index.html`, `comunidad.html` (filtro multimedia multi-seleccion + comentarios en modales de album; comunidad estrena tab "Audiovisual")
  - `mi-perfil.html` (inputs lat/lng para georreferenciar albumes + comentarios en el modal de detalle)
  - `admin.html` (panel de moderacion de comentarios)
  - `galeria.html` (NUEVO)
  - `album-comments.js` (NUEVO)
  - `api/pagina-destino.js` (boton "Ver galeria ampliada" -> `/galeria.html?destino=<slug>`)
  - `api/utilidades.js` (`/galeria.html` en STATIC_PAGES del sitemap)

- **Cambios completados (verificados contra archivo real, ADR-006):**
  1. **Fix 500 en albumes/mapa:** `COALESCE(u.foto_url, u.avatar_url, '')` en `album_detalle`/`multimedia_mapa` (avatar null ya no rompe); catch global `err.code === '42P01' || err.code === '42703'` -> 503 tipado `SCHEMA_NOT_MIGRATED` (L3920-3921) en vez de 500 generico.
  2. **Filtro multimedia multi-seleccion:** `multimedia_mapa` acepta `tipo_media=foto,video,audio` (CSV), consulta con `ANY($1::text[])` (L1807-1828), 400 estricto ante tokens invalidos (`tipos_invalidos`) en vez del fallback silencioso, y respuesta con `tipos_aplicados` (L1866).
  3. **Feed de fotos con orden:** `mi_feed_fotos?orden=top|recientes` (`feedOrden`, L1873; default recientes).
  4. **Contador de comentarios:** subquery derivada `comentarios` (COUNT activos) en `album_detalle` y `mi_feed_fotos` (patron ADR-023: contador derivado, sin columna persistida).
  5. **Comentarios tipo Facebook (ADR-023):** 6 ramas `tipo=` nuevas en `api/interacciones.js` SIN endpoint nuevo: GET `comentarios_foto` (arbol con `likes`/`ya_like`/`es_mio`/`nivel`/`respuestas[]`, L1917-1933), GET `galeria_destino` (L1713), GET `comentarios_recientes` (L1775), POST `comentario_foto` (201, rate-limit diario 30, +2 XP tope 20/dia, L2908), POST `comentario_eliminar` (soft-delete autor/admin + `cascada` opcional, L3023), POST `comentario_voto` (toggle `like`/`unlike` idempotente, 403 self-like, sin XP, L3094-3129).
  6. **Galeria ampliada:** `galeria.html` (NUEVO) con modo global (fotos mas votadas + albumes populares) y modo `?destino=<slug>` (fotos del destino + fotos de usuarios por votos), integra comentarios (`window.AlbumComments.mount`, L341-385); `api/pagina-destino.js` L1488: boton "Ver galeria ampliada" navega a `/galeria.html?destino=<slug>` con fallback al lightbox in-page si no hay slug; `api/utilidades.js` L20 agrega `/galeria.html` (priority 0.7, weekly) a STATIC_PAGES del sitemap.
  7. **Modulo audiovisual:** `comunidad.html` tab "Audiovisual" (L293, `initAudiovisual` L1614): grid de albumes + feed con orden recientes/populares/top y "cargar mas".
  8. **Georreferenciacion:** `mi-perfil.html` inputs lat/lng en albumes para que aparezcan en el mapa (`multimedia_mapa`).
  9. **Moderacion admin:** `admin.html` panel de comentarios (`adminCargarComentarios` -> GET `comentarios_recientes` + POST `comentario_eliminar` con cascada admin, L6139-6152).
  10. **Componente compartido:** `album-comments.js` (NUEVO) expone `window.AlbumComments.mount/toggle` (arbol anidado, indentacion visual clamp a 3 niveles, like/unlike, borrar, responder), consumido por index.html (L3392), comunidad.html (L1448), mi-perfil.html (L1188) y galeria.html.

- **Decisiones de producto (confirmadas por el usuario):**
  1. Ingreso de media por URL externa por ahora; SUBIDA REAL DE ARCHIVOS queda como TODO futuro (requiere storage externo tipo Vercel Blob/Supabase/Cloudinary porque Vercel Hobby no persiste archivos).
  2. Los links que sube un usuario quedan en su galeria y referenciados en el mapa (por eso lat/lng en albumes).
  3. Comentarios con likes y respuestas anidadas ILIMITADAS en datos (indentacion visual limitada a 3 niveles, ADR-023).
  4. Migraciones 004-012 ya aplicadas por Javier en Neon; la 013 la aplica manualmente el (bloqueante para los `tipo=` de comentarios; sin ella devuelven 503 `SCHEMA_NOT_MIGRATED`). ACTUALIZADO 2026-09-13: la 013 ya fue aplicada por Javier en Neon PRODUCCION (migraciones 011-014 aplicadas); queda la 015 del epic prompt.txt (TSK-100).

- **Verificacion (Escudo GOLD, 2026-09-12):** `node --check` PASS en api/interacciones.js, api/pagina-destino.js, api/utilidades.js y album-comments.js (re-verificado en esta sesion documental); ASCII-safety 0 bytes >127 en api/interacciones.js, album-comments.js y db/migrations/013_album_comentarios.sql. Hallazgo de QA de la sesion: canonicals con homografo cirilico `\u043E` en 8 HTML -> BUGS_HISTORICOS.md BUG-033 (NO bloqueante, fuera del alcance del epic).

- **PENDIENTES (bloqueantes):**
  1. **APLICAR `db/migrations/013_album_comentarios.sql` EN NEON -- [HECHO 2026-09-13] (lo ejecuto Javier en el editor SQL; idempotente IF NOT EXISTS, ASCII-safe, requiere migracion 009 previa; aplicada junto con 011/012/014 el 2026-09-13).** Sin la tabla, los `tipo=` de comentarios y el contador `comentarios` degradan a 503 `SCHEMA_NOT_MIGRATED` (catch 42P01 de este epic).
  2. **Commit + push + deploy manual** del working tree completo (incluye los pendientes de TSK-095/096/097 y los cambios de modelos de agentes de `.opencode/agent/`).
  3. **Verificacion post-deploy:** mapa con fotos de usuarios (albumes con lat/lng), abrir album sin 500, filtros multi-seleccion foto+video+audio, galeria ampliada (modo global y `?destino=`), comentarios end-to-end (crear/responder/like/unlike/borrar/moderar en admin).
  4. **TODO futuro: subida real de archivos** (storage externo tipo Vercel Blob/Supabase/Cloudinary; hoy el ingreso es por URL externa).

- **Fuera de alcance / backlog:** BUG-033 (canonicals cirilicos, NO bloqueante, fix de 1 caracter por archivo); subida real de archivos (TODO, requiere storage externo); nota ADR-023: `multimedia_mapa` y `fotos_top` pueden sumar el contador `comentarios` despues.

---

### TSK-099: Presencia Fisica + Espacial v4.0 (geocerca server-side en visita)

- **Estado:** IMPLEMENTADO EN WORKING TREE; PENDIENTE APLICAR MIGRACION 014 EN NEON + DEPLOY (backend + frontend verificados 2026-09-12: `node --check` PASS, ASCII 0 bytes >127, tests de logros 30/30)
- **Prioridad:** ALTA
- **Fecha:** 2026-09-12
- **Responsable:** backend-dev + renderer-dev + data-migration/sql-security + qa-auditor + docs-keeper
- **Dependencia:** ADR-024; migracion 012 (indice parcial resena/rating, PENDIENTE en Neon); migracion 013
- **ADR:** ADR-024
- **Spec:** `docs/superpowers/specs/2026-09-12-presencia-fisica-gamificacion-v4-design.md`
- **Prompt origen:** `prompt cambios.txt` (Presencia Fisica + Presencia Espacial)

- **Problema:** el POST `tipo=visita` otorgaba +20 XP sin presencia fisica; `quitar_visita` hacia `DELETE` fisico y permitia el ciclo visita/quitar_visita/visita (farming); el dedup `SELECT`+`INSERT` no era atomico; un radio fijo de 100 m castigaba la exploracion rural.

- **Subtareas:**
  1. **[A - Backend Haversine] HECHO:** `api/interacciones.js` v11. Helpers `haversineMetros` + `resolverRadioM` + constantes (`RADIO_DEFAULT_M=100`, `RADIO_POR_CATEGORIA`, `RADIO_POR_SUBCATEGORIA`, `RURAL_KEYWORDS`, `ACCURACY_MAX_M=150`, `COOLDOWN_MIN_SEG=90`, `MAX_VELOCIDAD_MPS=69.4`, `VISITAS_DIA_MAX=30`, `VECINOS_RURAL_MAX=3`, `VECINOS_BBOX_DEG=0.02`, `VISITA_BONO_RURAL=20`). Handler `tipo=visita` reescrito con el contrato 400/404/422/429/200 idempotente, dedup-first, evidencia `dims.geo`, bono rural, `zona_motivo` `subcategoria`/`keyword`/`densidad`/`urbano` y `modo='sin_geocerca'`; rechazo de `0,0`; tope diario en ventana movil de 24 h; `quitar_visita` -> `UPDATE activo=false` (soft-delete, sin descontar XP); catch `23505` -> 200 `ya_visitado`. Codigo real del error de velocidad: `VELOCIDAD_IMPOSIBLE`.
  2. **[B - Frontend geolocation] HECHO en working tree/HEAD `fcd6060`:** `usuario-session.js` `obtenerUbicacion()` (`navigator.geolocation.getCurrentPosition`, `enableHighAccuracy`, timeout 10 s) + `marcarVisitado()` enviando `lat/lng/accuracy/ts` + `mensajeErrorVisita()`; `sincronizarGuardados()` ya NO migra visitas (solo guardados, comentario ADR-024); `api/pagina-destino.js` boton `marcarVisitadoBtn` con estado de carga que llama `window.ExploraCO.marcarVisitado(DID)`.
  3. **[C - Migracion 014] CREADA, PENDIENTE DE APLICAR:** `db/migrations/014_reset_visitas_presencia_fisica.sql` (10 pasos sin tablas temporales para compatibilidad con el editor SQL de Neon, idempotente, transaccional, ASCII-safe): respaldo `interacciones_visitas_reset_backup`; recomputo de `usuarios.xp_total` (resta `SUM(xp_ganado)` + bonos `mis_primera_visita` 15 / `mis_itinerario_perfeccion` 60 / `logr_visitas_5` 15 / `logr_visitas_20` 50), `total_visitas`, `pandillas.fama_total` y `pandilla_retos`; reset dirigido de flags JSONB; purga fisica de visitas gamificadas; `CREATE UNIQUE INDEX idx_interacciones_visita_unica (usuario_id,destino_id) WHERE tipo='visita' AND usuario_id IS NOT NULL`. Conserva analitica anonima (`usuario_id IS NULL`) y cromos.
  4. **[D - ADR-024] HECHO (esta sesion documental):** ADR-024 en `DECISIONS.md` + spec en `docs/superpowers/specs/2026-09-12-presencia-fisica-gamificacion-v4-design.md`.
  5. **[E - QA] HECHO (salvo smoke dedicado):** tests de Haversine/radios/zona rural/anti-spoofing/idempotencia/soft-delete/`sin_geocerca` cubiertos; Escudo GOLD (`node --check` PASS, ASCII 0 bytes >127); tests de logros actualizados a 30 en `scripts/test_logros_catalogo.js`, `scripts/smoke_test_perfil_progreso.js`, `scripts/smoke_test_comunidad.js` y `scripts/verify_comunidad_prod.js` (todos PASS). `scripts/smoke_visita_geocerca.js` (smoke dedicado del contrato) 15/15 PASS (ejecutado 2026-09-12).

- **Decisiones de producto (aprobadas):** radios adaptativos 100/150/200/250 m (keyword -> subcategoria -> categoria -> default); bono rural plano +20 XP solo en INSERT fresco (sin multiplicador/amuleto/fama); `logr_pionero` tier plata 40 XP; `sin_geocerca` para destinos sin coordenadas; reset unico autorizado con respaldo; spoofing residual -> ADR-025 candidato.

- **Impacto:** `api/interacciones.js`, `usuario-session.js`, `api/pagina-destino.js`, `db/migrations/014_reset_visitas_presencia_fisica.sql`, `scripts/test_logros_catalogo.js` (+ smokes de logros), docs. **Sin endpoints nuevos** (8/8, ADR-010). **Trade-off:** el contador publico de visitas de `api/utilidades.js` puede bajar tras el reset. **Drift residual de XP** por multiplicadores/amuleto (sin ledger) documentado en el spec.

- **Evidencia:** `node --check api/interacciones.js` PASS; ASCII 0 bytes >127 en `api/interacciones.js`; handler `tipo=visita` con Haversine/geocerca/anti-farming/`dims.geo`/bono rural y `quitar_visita` soft-delete verificados contra archivo real; logro `logr_pionero` presente en el catalogo (LOGROS 30); tests de logros 30/30 PASS en los 4 scripts; `node scripts/smoke_visita_geocerca.js` 15/15 PASS (validaciones tempranas, dedup activa/inactiva, cooldown, tope diario, caminos felices urbano xp 20 y rural xp 40). Falta: la verificacion en vivo tras aplicar la migracion 014 y desplegar.

- **Pendiente BLOQUEANTE (ACTUALIZADO 2026-09-13):** la migracion 014 YA fue aplicada por Javier en Neon (junto con 011/012/013, mismas fechas). Queda: aplicar la migracion 015 del epic prompt.txt (TSK-100) tras el commit + commit/push/deploy manual + verificacion en vivo de la geocerca (marcar "Estuve aqui" exige ubicacion, fuera de rango -> 422 FUERA_DE_RANGO).

---

### TSK-100: Epic prompt.txt -- perfil museo v1, vocaciones acumulables, chat por plan privado, XP admin y fixes multimedia (BUG A/B) [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-13, implementada en working tree; Escudo GOLD verde; pendiente aplicar migracion 015 en Neon + commit/push/deploy)
- **Prioridad:** ALTA
- **Fecha:** 2026-09-13
- **Prompt origen:** `prompt.txt` (museo de trofeos en mi-perfil, vocaciones de artista estilo Diablo/PoE/Albion, limpieza de salas de la comunidad, chat propio por plan, XP admin para testear niveles, BUG A 503 de album_detalle, BUG B mapa cultural sin fotos de usuarios)
- **Spec:** `docs/superpowers/specs/2026-09-13-epic-prompt-vocaciones-chat-perfil-design.md`
- **ADR:** ADR-026 (DECISIONS.md)
- **Responsable:** free-build (orquestador) + free-tpl/frontend/admin/renderer/backend/js-silo/qa + docs-keeper

- **Nota de migraciones (registro):** las migraciones **011-014 YA fueron aplicadas por Javier en Neon PRODUCCION el 2026-09-13** (011 direccion, 012 dedup resena/rating, 013 comentarios, 014 reset de visitas presencia fisica). La **015 `db/migrations/015_epic_prompt.sql` queda PENDIENTE de aplicar por Javier tras el commit** (idempotente IF NOT EXISTS + ON CONFLICT, ASCII-safe, 4 bloques).

- **Subtareas (del Alcance de la spec; las 7 + 2 bugs):**
  1. **[Perfil museo v1] HECHO:** `mi-perfil.html` (1.575 lineas) estrena museo-line en el hero (`#pf-museo-line`: trofeos·fotos·destinos con backfill real, L906), galeria de mejoras de perfil (`#pf-mejoras-grid`: 3 consumibles `perfil_*`), seccion Vocaciones de artista (`#pf-vocaciones-grid` con toggle, candado por nivel y manejo de 403) y chip "Sin mapa" en albumes sin lat/lng (`\u26A0 Sin mapa`, L1241/1359). CSS vitrina de trofeos. Divs 195/195. Vitrina extendida y sello verificado quedan como futuro cercano (decision de Javier).
  2. **[Vocaciones acumulables] HECHO:** catalogo `VOCACIONES` en codigo (`api/interacciones.js` L181-188: musico@5, cine@8, artista_grafico@11, cada una con habilidades[]); columna `usuarios.vocaciones jsonb NOT NULL DEFAULT '{}'` (migracion 015, merge ADR-003); GET `vocaciones_catalogo` (publico), GET `vocaciones_usuario` y POST `vocacion_activar` (toggle, gate de nivel server-side 403). ACUMULABLES: el usuario puede tener todas las que desbloquee.
  3. **[Comunidad: limpieza de salas] HECHO:** migracion 015 borra `chat_salas WHERE creador_id IS NULL AND nombre NOT IN ('Chat general','Bogota')` (idempotente, acumulativa sobre el seed de 008; CASCADE limpia los mensajes). `comunidad.html` agrega filtro defensivo `tipo !== 'plan'` en el listado, bloque "Niveles de chat" (5 perks: chat@3, crear_chat@3, emojis_premium@7, sello_sala@10, moderador_chat@12) y refactor compartido chatMsgsHTML/chatPollTick/enviarMensajeOpt. Divs 223/223.
  4. **[Chat por plan privado] HECHO:** `planes_viaje.sala_id uuid REFERENCES chat_salas(id)` (FK nullable, sin CASCADE, migracion 015); `plan_crear` crea `chat_salas` tipo='plan' y liga la sala (L2736-2748); GET `plan_chat` (sala + mensajes + miembros, gate miembro/creador 403, L1641-1678) y POST `plan_chat_msg` (gate miembro, +2 XP tope 20/dia reusando chatXpDisponible/registrarChatXp, L2811-2850); defensa: `chat_msg` POST rechaza salas de plan y `chat_mensajes` GET las excluye (L1595); GET `planes`/`planes_mios` exponen `p.sala_id`; `comunidad.html` modal privado "Chat del plan" (abrirPlanChat/enviarPlanChat/polling 5 s, L1058-1154) e indicador "chat activo" (L987-988).
  5. **[Admin XP] HECHO:** POST `admin_xp` (L3274-3336, Bearer `ADMIN_SECRET` con fallback 'exploraco12345'): `{usuario_id, delta_xp}` (Math.max(0,...)) o `{usuario_id, nivel}` 1-20 (Math.max con el umbral, NO degrada); recalcula con calcularNivelLocal/calcularEraLocal/BADGES_LOCAL; `UPDATE usuarios SET xp_total=$1, ultimo_acceso=NOW()` (se uso `ultimo_acceso`, no `actualizado_en`, porque esa columna no existe en usuarios). `admin.html` tab "Jugadores" (snav-jugadores + showScreen('jugadores'), L1980-2039): buscador por nombre/email, tarjeta de jugador (nivel, XP, era, logros, vocaciones activas), sumar/restar XP y subir a nivel exacto 1-20; refactor `_adminBuscarUsuarios` compartido con blogBuscarAutor (L6933). Divs 786/786.
  6. **[BUG A -- 503 album_detalle] HECHO:** helper `contarComentarioSafe(sql, fotoId)` (L1025) degrada a 0 comentarios si la tabla `album_comentarios` (migracion 013) no existe (catch 42P01/42703), aplicado en `album_detalle`, `galeria_detalle` y `mi_feed_fotos`. `comentarios_recientes` (admin) sigue exigiendola (503 tipificado, no degrada silenciosamente).
  7. **[BUG B -- mapa cultural sin fotos de usuarios] HECHO:** `multimedia_mapa` ya no exige coords en el album: helper `coordsFallbackAutor(sql, usuarioId)` (L1045) hereda lat/lng/ciudad de la primera visita/guardado del autor hacia un destino georreferenciado; descarta los que quedan sin coords; flag `coords_heredadas`. Resuelve el caso reportado (hostal r10).
  8. **[Backend api/usuarios.js] HECHO:** v8 (180 lineas): GET `?buscar=` (2+ chars, ILIKE sobre nombre/email, limit 20, pasa por conLogros/conMisiones/conNivel, L126-141) y columna `vocaciones` incluida en SELECT * (perfil).
  9. **[user-session] HECHO:** `emojis_premium@7` y `sello_sala@10` en CAPACIDADES_POR_NIVEL (L47-48) + catalogo `window.ExploraCO.vocaciones` (L59-87). `subirNivelTest(n)` NO se creo (no hay helpers de test previos en el proyecto; decision de no inventar infraestructura).

- **Decisiones de producto (Javier, 2026-09-13):** vocaciones acumulables (no exclusivas); mejoras de perfil v1 = SOLO marco dorado (700 XP), tema galeria oscura (500 XP) y banda de artista (900 XP) como consumibles permanentes (ON CONFLICT clave) activados por `usar_consumible`; chat de plan PRIVADO solo miembros; admin XP = "subir a nivel X exacto" + delta manual, sin degradar; migraciones 011-014 YA aplicadas en Neon; la 015 la aplica Javier tras el commit.

- **Verificacion (Escudo GOLD, 2026-09-13):** `node --check` PASS en api/interacciones.js (v12, 4.547 lineas) y api/usuarios.js (v8); ASCII 0 bytes >127 en los api/*.js y en la migracion 015; balance de divs mi-perfil 195/195, comunidad 223/223 y admin 786/786; header de interacciones.js v12 con el bloque del epic en L75-83. SMOKE DEDICADO DEL EPIC ENTREGADO: `scripts/smoke_test_epic_prompt.js` 50/50 PASS (ejecutado 2026-09-13, salida "SMOKE EPIC PROMPT: OK"), cubre vocaciones, admin_xp, plan_chat/plan_chat_msg, contarComentarioSafe, coordsFallbackAutor, queries capturadas sala_id/tipo!=plan, divs de los 3 HTML y la migracion 015.

- **PENDIENTES (bloqueantes):**
  1. **APLICAR `db/migrations/015_epic_prompt.sql` EN NEON (lo ejecuta Javier en el editor SQL de Neon tras el commit; idempotente IF NOT EXISTS + ON CONFLICT, requiere la 008 para chat_salas/planes_viaje y la 010 para consumibles).** Sin la columna `usuarios.vocaciones` y `planes_viaje.sala_id`, `vocacion_activar`/`vocaciones_*` responden 500/503 y `plan_crear` falla al ligar la sala.
  2. **Commit + push + deploy manual** del working tree completo (incluye los pendientes de TSK-095/096/097/098/099 y la migracion 015).
  3. **Verificacion post-deploy en vivo:** vocaciones end-to-end (toggle + candado 403), admin_xp niveles 1-20 sin degradacion, plan_chat con miembro vs no-miembro (403), mapa cultural con fotos de usuarios (caso hostal r10), contadores de comentarios sin 503, y un plan nuevo con chat ligado.

- **Pendientes pequenos / backlog:** backfill opcional de `sala_id` para planes EXISTENTES (la migracion los deja NULL; solo los planes creados tras el deploy obtienen sala via `plan_crear`); vitrina extendida de perfil y sello verificado (futuro cercano, decision de Javier); `comunidad.html` capa multimedia con `origen=album` (candidata a unificar, backlog TSK-096); BUG-033 canonicals cirilicos (NO bloqueante). NOTA de cierre QA: el smoke dedicado del epic SI se entrego en `scripts/smoke_test_epic_prompt.js` (50/50 PASS, ver Verificacion arriba).

- **Fuera de alcance:** subida real de archivos (requiere storage externo, TODO vigente de TSK-098); ADR-025 (sesion firmada/atestacion, candidato); cambios de codigo posteriores al registro documental.

---

### TSK-101: Entrega 016 "ExploraCO Gaming v5.0" -- piramide de referidos, crowdsourcing Wayfarer (Activo Oculto), 4 facciones y mundo artistas [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-14, implementada y verificada en working tree; pendiente aplicar la migracion 016 en Neon + configurar `RESEND_API_KEY`/`SESSION_JWT_SECRET` en Vercel + commit/push/deploy)
- **Prioridad:** ALTA
- **Fecha:** 2026-09-14
- **Prompt origen:** `promptgamming.md` (Entrega 016 "ExploraCO Gaming v5.0", aprobada por arquitectura y verificada contra el repo real)
- **ADR:** ADR-027 (piramide + crowdsourcing + facciones + mundo artistas) y ADR-025 (sesion firmada / anti-Sybil, consume el candidato reservado desde ADR-024)
- **Checklist de despliegue:** `docs/DEPLOY_016.md`
- **Responsable:** build (orquestador) + backend/architect/sql-security/admin/frontend/qa + docs-keeper

- **Alcance ejecutado (verificado contra archivo real, ADR-006):**
  1. **[Esquema] `db/migrations/016_multinivel_crowdsourcing.sql` (NUEVA, 209 lineas, idempotente ADR-008, ASCII-safe ADR-002):** 10 columnas en `usuarios` (`referido_por`, `codigo_referido`, `xp_ref_total`, `referidos_directos_contados`, `faccion` con CHECK de 4 facciones, `faccion_elegida_en`, `email_verificado`, `email_token`, `email_token_expira`, `device_hashes`) + 4 tablas (`activos_ocultos`, `activos_ocultos_votos`, `activos_ocultos_checkins`, `geo_nonces`) + 8 indices. Idempotencia DDL verificada 13/13.
  2. **[Backend `api/usuarios.js` v8 -> v9]:** piramide de referidos (codigo, red CTE de 5 niveles, `?ref=` en registro con topes 500/20, reparto 10/5/3/2/1 FLOOR en `xp_ref_total`), 4 facciones (primera gratis, cambio 500 `xp_total` + cooldown 15 dias), verificacion de email (Resend), JWT HMAC (`firmarSesion`, `SESSION_JWT_SECRET`) y `device_hashes`.
  3. **[Backend `api/interacciones.js` v12 -> v13]:** helper `repartirXpReferidos` (CTE recursiva) inyectado en 14 puntos de XP real (excluye `admin_xp` y `comprar_consumible`); Wayfarer Activo Oculto completo (proponer sin nivel pero con email verificado, votar nivel 5, quorum +/-3, 30 dias derivado, +50/+5/+15 XP, checkin reusa geocerca ADR-024 + nonce); `validarSesion` (JWT con `timingSafeEqual`) en visita/votar/checkin; nonce en visita y checkin; vocaciones en bloque nivel 5 (musico/cine/artista_grafico/escritor); 6 misiones de artista.
  4. **[Backend `api/admin.js`]:** rama `activo_oculto_moderar` (Bearer admin): aprobar +50 XP al proponente con reparto piramidal, rechazar sin XP y borrado logico (`activo=false`).
  5. **[Frontend]:** `mi-perfil.html` (Mi Red + QR + selector de facciones + panel de vocaciones + banner de verificacion), `comunidad.html` (relabel visual Pandilla->Parche solo en el texto visible + seccion Activo Oculto + ranking de facciones), `admin.html` (panel de moderacion de Activos Ocultos), `usuario-session.js` (catalogo de vocaciones nivel 5, fingerprint de dispositivo, JWT + refresh silencioso).
  6. **[Governanza/config]:** `.gitignore` corregido (filtra `.env`, `.env.local`, `.env.*.local`; conserva `!.env.example`), `.env.example` creado (NUEVO, plantilla con `DATABASE_URL`, `ADMIN_SECRET`, `SESSION_JWT_SECRET`, `RESEND_API_KEY`, `ADMIN_EMAIL`, `SITE_URL`, `DEV_EMAIL_ECHO`), `docs/DEPLOY_016.md` (NUEVO, checklist de 5 pasos).

- **Presupuesto de endpoints:** **8/8 INTACTO** (verificado con `git status`: cero archivos nuevos en `api/`; todo entro como ramas `tipo=` y helpers dentro de los endpoints existentes, ADR-010).

- **Evidencia (Escudo GOLD, 2026-09-14):**
  - Smoke dedicado `scripts/smoke_016_multinivel_crowdsourcing.js`: **39/39 PASS** (ejecutado en esta sesion documental, salida "SMOKE 016 MULTINIVEL: OK").
  - `node --check` PASS x3 (`api/usuarios.js`, `api/interacciones.js`, `api/admin.js`); ASCII-safety **0 bytes >127** y **0 backticks**; balance de divs **0**; idempotencia DDL **13/13**.
  - Arquitectura: 8 archivos en `api/` (sin altas); headers reales confirmados `api/usuarios.js` v9 y `api/interacciones.js` v13.

- **PENDIENTE OPERATIVO (bloqueante para produccion, lo ejecuta Javier):**
  1. **Aplicar `db/migrations/016_multinivel_crowdsourcing.sql` en Neon antes del deploy** (editor SQL, archivo COMPLETO en una corrida; idempotente). Prerrequisito declarado en `docs/DEPLOY_016.md`: migraciones **010 a 015** ya aplicadas (verificar 015 -- ADR-006).
  2. **Configurar variables en Vercel:** `SESSION_JWT_SECRET` (generar aleatorio fuerte; el fallback `dev_secret` es inseguro) y `RESEND_API_KEY`; `SITE_URL` (`https://exploraco.co` si el dominio propio esta activo, `https://exploraco.vercel.app` si no). Confirmar `DATABASE_URL`/`ADMIN_SECRET` reales. NO configurar `DEV_EMAIL_ECHO` en produccion.
  3. **Deploy en UN SOLO release:** `api/usuarios.js` v9 + `api/interacciones.js` v13 + `api/admin.js` deben viajar juntos y compartir el MISMO `SESSION_JWT_SECRET` (si una funcion usa otro secreto, los usuarios reciben 401).
  4. **Verificacion en vivo:** registro con `?ref=`, verificacion de correo, eleccion/cambio de faccion, proponer/votar/checkin de Activo Oculto, moderacion admin (+50 XP al aprobar), y sesion JWT (token alterado -> 401).

- **Fuera de alcance:** subida real de archivos (storage externo, TODO de TSK-098); atestacion nativa de dispositivo (Play Integrity/App Attest, evolucion futura de ADR-025); correccion del drift documental de `scripts/validate_ficha.js` (ver BUGS_HISTORICOS.md BUG-034).

---

### TSK-102: Consolidacion documental del sistema de gamificacion y apartado social (v5) [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-14, working tree; solo documentacion, sin cambios de codigo)
- **Prioridad:** MEDIA
- **Fecha:** 2026-09-14
- **Prompt origen:** cierre documental de la Entrega 016 ("ExploraCO Gaming v5.0") y del Plan Maestro v5
- **ADR:** ADR-006 (baseline = archivo real), ADR-002 (docs core ASCII-safe), ADR-025/ADR-027 (decisiones consolidadas)
- **Responsable:** docs-keeper (Documentation Specialist, ruta de pago)

- **Alcance ejecutado (verificado contra archivo real, ADR-006):**
  1. **Documento maestro gaming v5:** `exploraco desarrollo/ampliacion desarrollo/ExploraCO_Gamificacion_v5_Plan_Maestro.md` -- Plan Maestro tecnico + hoja de ruta del sistema de gamificacion (v4 + Entrega 016), con estados IMPLEMENTADO / SOLO BACKEND / SOLO DOCUMENTADO / ROTO y citas `archivo:linea`; enlace cruzado al Sistema Social v5.
  2. **Documento maestro social v5:** `exploraco desarrollo/ampliacion desarrollo/ExploraCO_Sistema_Social_v5.md` -- mapa consolidado del apartado social (hub, Parches, chat/planes, albumes/comentarios, resenas, referidos, facciones, Wayfarer, notificaciones) con tabla de gaps G-01..G-23 y discrepancias D-01..D-15; enlace cruzado al Plan Maestro v5.
  3. **Docs core consolidados por esta tarea:** TASKS.md (TSK-102), NEXT.md (completado reciente + pendientes/riesgos) y BUGS_HISTORICOS.md (BUG-035..BUG-043). Los docs core PROJECT.md, BLUEPRINT.md, GUIA_DE_DESARROLLO.md y RUTA los cubre otra tarea paralela (no se tocan aqui).
  4. **Specs:** `docs/superpowers/specs/2026-09-14-gaming-v5-referidos-wayfarer-facciones-design.md` (diseno de la Entrega 016) e indice `docs/superpowers/specs/README.md` (13 specs).

- **Gaps documentados (referencia):** los 9 hallazgos reales de la consolidacion quedan con severidad y evidencia `archivo:linea` en BUGS_HISTORICOS.md BUG-035 a BUG-043: referidos inalcanzables por web (BUG-035), visita rota en frontend (BUG-036), notificacion de resena a endpoint inexistente (BUG-037), conteo de miembros de Parche (BUG-038), relabel residual Pandilla (BUG-039), etiquetas de chat desfasadas (BUG-040), gate de voto de utilidad ausente (BUG-041), formula de nivel de `album_crear` (BUG-042), tabs de comunidad en GUIA (BUG-043). El mapa completo (23 gaps) vive en `ExploraCO_Sistema_Social_v5.md` seccion 15.2.

- **Evidencia (ADR-006):** los dos documentos maestros existen en `exploraco desarrollo/ampliacion desarrollo/`; el enlace Plan Maestro v5 -> Sistema Social v5 y el inverso fueron verificados (ambos archivos existen y las rutas citadas son correctas); los 9 BUGs se registraron con la evidencia confirmada contra el codigo real (`mi-perfil.html:1800`, `usuario-session.js:598-609`, `api/interacciones.js:4618-4637`, `api/interacciones.js:2602-2604`, `mi-perfil.html:514/517`, `index.html:4037`, `comunidad.html:648-654`, `api/interacciones.js:3329-3380`, `api/interacciones.js:3479`, `GUIA_DE_DESARROLLO.md:900-903`).

- **Pendiente operativo (heredado de TSK-101, sin cambio):** aplicar `db/migrations/016_multinivel_crowdsourcing.sql` en Neon; configurar `SESSION_JWT_SECRET` y `RESEND_API_KEY` (y `SITE_URL`) en Vercel; commit/push/deploy en un solo release; verificar en vivo. Persisten 2 flujos ROTO de UI (BUG-035/BUG-036) que requieren codigo (fuera del alcance documental).

- **Fuera de alcance:** correccion de los 9 hallazgos en codigo (se documentan, no se corrigen); actualizacion de GUIA_DE_DESARROLLO.md/RUTA/PROJECT.md/BLUEPRINT.md (otra tarea).

---

### TSK-103: Perfil publico museo + Mensajeria Directa + Arbol de Clases de 16 ramas + Casas + categorias de consumibles [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-15, implementada y verificada en working tree; el smoke de cierre esta ENTREGADO y en verde 73/73 PASS). **PENDIENTE OPERATIVO: aplicar `db/migrations/017_perfil_publico_arbol_casas.sql` y `db/migrations/018_consumibles_categorias.sql` en Neon (016/015 ya aplicadas) + commit/push/deploy.** El smoke dedicado `scripts/smoke_017_perfil_arbol_casas.js` esta ENTREGADO (verificado contra archivo real, ADR-006: el archivo existe) y pasa 73/73 PASS (evidencia: `node scripts/smoke_017_perfil_arbol_casas.js` -> 73/73 PASS, 2026-09-15).
- **Prioridad:** ALTA
- **Fecha:** 2026-09-15
- **Prompt origen:** `PROMPT.md` (Entrega "perfil publico museo + DM + Arbol de 16 ramas + Casas + categorias de consumibles", WP-1..WP-7)
- **ADR:** ADR-028 (DECISIONS.md); consume precedentes ADR-018/ADR-025/ADR-026/ADR-027
- **Checklist de despliegue:** `docs/DEPLOY_017.md`
- **Responsable:** free-build/build (orquestador) + backend/sql-security/frontend/admin/renderer/qa + docs-keeper

- **Alcance ejecutado (verificado contra archivo real, ADR-006):**

  **WP-1 [Esquema -- migracion 017] COMPLETADO (aplicacion en Neon PENDIENTE):** `db/migrations/017_perfil_publico_arbol_casas.sql` (NUEVA, aditiva e idempotente ADR-008, ASCII-safe ADR-002). Columnas: `usuarios.intereses` (jsonb), `usuarios.pais_base` (varchar(2)), `usuarios.casa` (varchar(20)), `usuarios.casa_elegida_en` (timestamptz), `usuarios.progreso_arbol` (jsonb), `usuarios.perfil_config` (jsonb), `usuarios.perfil_publico` (boolean), `usuarios.dm_abierto` (boolean); `consumibles.categoria` (varchar(30) DEFAULT 'general'); `chat_salas.clave_dm` (varchar(80)). Constraints/indices: `chk_usuarios_casa`, `chk_chat_salas_tipo` (se elimina antes `chat_salas_tipo_check` legacy para no duplicar), `idx_chat_salas_dm_unica`, `idx_chat_salas_dm_a`, `idx_chat_salas_dm_b`, `idx_usuarios_casa`, `idx_usuarios_pais_base`, `idx_interacciones_usuario_tipo_activo`. Tabla NUEVA `usuario_bloqueos` (PK compuesta, `chk_usuario_bloqueos_distintos`) + `idx_usuario_bloqueos_bloqueado`.
  **WP-2 [Esquema -- migracion 018] COMPLETADO (aplicacion en Neon PENDIENTE):** `db/migrations/018_consumibles_categorias.sql` (NUEVA, aditiva). Categoriza 17 consumibles: `perfil` 7 (`perfil_marco_dorado`, `perfil_tema_oscuro`, `perfil_banda_artista`, `perfil_marco_plata`, `perfil_vitrina_destacada`, `perfil_titulo_custom`, `perfil_fondo_paisaje`), `impulso` 3, `social` 4, `coleccion` 2, `general` 1. Un UPDATE por categoria con lista explicita de claves (se evita `LIKE 'perfil_%'` por el comodin `_`). Presupone la 017 aplicada.
  **WP-3 [Perfil publico + blindaje PII] COMPLETADO:** `api/usuarios.js` v10 -- `GET tipo=perfil_publico` (version ligera) + proyeccion owner-aware de `GET ?id=` (subconjunto publico SIN email/tokens/`device_hashes`/`codigo_referido`; el detalle completo solo para admin o el dueno); `?buscar=` exige admin; `?tipo=referido_codigo` exige sesion firmada JWT (ADR-025). Cierra la fuga de PII PREEXISTENTE. `api/interacciones.js` gana `GET tipo=museo_publico` (perfil + trofeos + fotos + destinos + arbol en solo lectura) y `api/utilidades.js` agrega `/registro.html` y `/perfil.html` a `STATIC_PAGES`.
  **WP-4 [Arbol de Clases de 16 ramas] COMPLETADO:** `api/interacciones.js` v14 -- catalogo `RAMAS` en codigo (16 = 4 facciones x 4 ramas, 5 nodos cada una; `RAMA_TIERS = [0,100,250,450,700]`), puntos derivados `D_R` recalculados en cada lectura + bonos SOLO de misiones completadas. Ramas: GET `arbol_catalogo` (publico), GET `arbol_usuario` (progreso + persistencia write-once de fechas de nodo para el dueno con sesion), POST `rama_activar` (gate nivel 5, sin coincidencia de faccion; `art_*` delega en `usuarios.vocaciones`), POST `arbol_usuario` `accion=bono_mision` (+25 unico e idempotente de `mis_perfil_completo`). `comprar_consumible` aplica el descuento del nodo 5 si la categoria coincide. `museo_publico` expone el arbol en solo lectura.
  **WP-5 [Casas + Origen + perfil_actualizar] COMPLETADO:** `api/usuarios.js` v11/v12 -- POST `casa_elegir` (espejo de `faccion_elegir`, con sesion firmada y nivel 2) y GET `casa_ranking` (normalizado por numero de miembros); POST `perfil_actualizar` (alias `perfil_editar`) con SET dinamico parametrizado, sesion firmada del dueno, `pais_base` ISO-2 y merge JSONB de `perfil_config`. `api/interacciones.js` v15 -- Origen derivado (`local`/`nacional`/`extranjero`) por FILA de accion comparando `pais_base`/`ciudad_base` con la ciudad del destino (normalizada con `TRANSLATE`); bono x1.2 SOLO dentro de `D_R` (nunca sobre `xp_total` ni `interacciones.xp_ganado`); 8 misiones de grupo `perfil` (`mis_perfil_*`).
  **WP-6 [DM + bloqueos + categorias en admin] COMPLETADO:** `api/interacciones.js` -- DM (`dm_enviar` / `dm_hilos` / `dm_mensajes` / `dm_bloquear`) sobre `chat_salas.tipo='dm'` + `clave_dm`; hilo nuevo con cobro de 20 XP al emisor; respeto de `usuario_bloqueos` (403); `chat_msg` rechaza atacar salas DM. GET `consumibles?categoria=` (filtro; degrada si `categoria` no existe, ADR-008). `api/admin.js` -- `normalizarCategoriaConsumible` + `categoria` en `consumibles_lista`/`crear`/`editar` (400 `CATEGORIA_INVALIDA`).
  **WP-7 [Frontend + fixes + docs] COMPLETADO:** `perfil.html` (NUEVO), `registro.html` (NUEVO, alta con `?ref=`), `mi-perfil.html` (bloque Mi Red con QR/codigo/enlace, bandeja DM, Arbol de Clases SVG, pestanas PERFIL/CLASE/MI RED/MUSEO/INVENTARIO/MENSAJES/CUENTA, "Completa tu perfil", selector de Casa, tienda por chips de categoria, redirect R-3, relabel R-5), `comunidad.html` (R-4), `index.html` (R-5), `usuario-session.js` (captura `?ref=` con TTL 30d + `loginConEmail` con `codigo_referido` + JWT en refresco), `docs/DEPLOY_017.md` (NUEVO), `scripts/verify_017_precheck.js` (NUEVO, read-only).

- **Fixes R-1..R-5 (regresiones cerradas en esta entrega):**
  1. **R-1:** `registro.html` faltante (BUG-035) -> creada la pagina de alta con captura de `?ref=`.
  2. **R-2:** el frontend no capturaba `?ref=` -> `usuario-session.js` lo captura con TTL 30d y lo envia como `codigo_referido` en `loginConEmail`.
  3. **R-3:** `mi-perfil.html?id=` ignoraba el parametro -> redirect a `perfil.html?id=`.
  4. **R-4:** etiqueta "Control Territorial" enganosa en `comunidad.html` -> corregida.
  5. **R-5:** relabel Pandilla->Parche en la UI (residual de BUG-039) -> `index.html` y `mi-perfil.html`.

- **Fixes adicionales de seguridad/consistencia (detectados durante la entrega):**
  1. **Fuga de PII preexistente** en `api/usuarios.js` `?id=`/`?buscar=`/`referido_codigo` -> proyeccion owner-aware + admin-only + JWT (WP-3).
  2. **Carrera del cobro del DM** -> hilo nuevo idempotente (`ON CONFLICT (clave_dm) WHERE tipo='dm'`).
  3. **`museo_publico` tragaba el error de esquema** (devolvia 404 en vez de 503) -> error tipificado 503 `SCHEMA_NOT_MIGRATED`.
  4. **`casa_ranking`/`exp_ocultos` contaban Activos Ocultos sin filtrar `activo=true`** -> filtro agregado.

- **Desviaciones justificadas vs el prompt (registradas en ADR-028):** (a) `usuarios.bio` ya existia sin versionar, no se re-declara; (b) no se crea `idx_chat_mensajes_sala_fecha` porque `idx_chat_mensajes_sala` ya existe; (c) SI se crea el CHECK `chk_chat_salas_tipo` (008 no lo tenia) pese al "no inventes uno"; (d) los 5 senderos de `tabla_destino` CONVIVEN en la UI (no se reemplazan por el arbol); (e) se progresa en TODAS las ramas de cualquier faccion (`rama_activar` solo exige nivel 5).

- **Deuda tecnica (patron BUG-021):** columnas NO versionadas confirmadas en Neon: `interacciones.activo`, `usuarios.bio` y `usuarios.activo`. No se declaran en 017 para no chocar con la realidad; queda como deuda documentada.

- **Presupuesto de endpoints:** **8/8 INTACTO** (ADR-010). Cero archivos nuevos en `api/`; todo entra como ramas `tipo=` y helpers en `api/usuarios.js` (v12), `api/interacciones.js` (v15), `api/admin.js` y `api/utilidades.js`.

- **Evidencia (ADR-006, contra archivo real):**
  - Existen: `db/migrations/017_perfil_publico_arbol_casas.sql` (12.013 bytes), `db/migrations/018_consumibles_categorias.sql` (5.281 bytes), `perfil.html` (53.205 bytes), `registro.html` (13.991 bytes), `docs/DEPLOY_017.md` (7.870 bytes), `scripts/verify_017_precheck.js` (6.177 bytes).
  - `scripts/smoke_017_perfil_arbol_casas.js` -> **COMPLETADO** (ENTREGADO, 31.677 bytes). Evidencia: `node scripts/smoke_017_perfil_arbol_casas.js` -> `73/73 PASS` (2026-09-15).
  - Headers reales: `api/usuarios.js` v12 (perfil_publico, blindaje PII, casas, perfil_actualizar) y `api/interacciones.js` v15 (arbol, museo_publico, DM, consumibles?categoria, Origen, 8 misiones perfil).
  - `api/utilidades.js` contiene `/registro.html` y `/perfil.html` en `STATIC_PAGES`; `api/admin.js` contiene `categoria` en el CRUD de consumibles.

- **PENDIENTE OPERATIVO (bloqueante para produccion, lo ejecuta Javier):**
  1. **Aplicar `db/migrations/017_perfil_publico_arbol_casas.sql` en Neon** (editor SQL, archivo COMPLETO en una corrida; idempotente). Prerrequisito: 016/015 ya aplicadas.
  2. **Aplicar despues `db/migrations/018_consumibles_categorias.sql`** (presupone la 017: la columna `consumibles.categoria` la agrega la 017).
  3. **Smoke de cierre:** `node scripts/smoke_017_perfil_arbol_casas.js` -> `73/73 PASS` (2026-09-15). ENTREGADO y en verde; ya no es pendiente.
  4. **Commit + push + deploy en un solo release** (incluye los pendientes previos sin commitear de TSK-095..TSK-102).
  5. **Verificacion en vivo:** perfil publico `perfil.html?id=` sin PII, DM (hilo nuevo, cobro 20 XP, bloqueo 403), Arbol (activar nodo nivel 5, bono de mision), Casas (elegir + ranking), tienda por categorias, `?ref=` capturado en `registro.html`.

- **Fuera de alcance:** migracion de datos legacy no prevista; atestacion nativa de dispositivo (evolucion futura de ADR-025); correccion de la deuda de columnas no versionadas (solo se documenta).

---

### TSK-104: Verificacion admin forzada en el upsert + rama `verificar_usuario` + dashboard con datos reales (5 tarjetas) y filtro de verificados [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-15, implementada y verificada en working tree, Escudo GOLD PASS). **PENDIENTE OPERATIVO: aplicar `db/migrations/017_perfil_publico_arbol_casas.sql` y `db/migrations/018_consumibles_categorias.sql` en Neon (016/015 ya aplicadas) + commit/push/deploy.**
- **Prioridad:** MEDIA
- **Fecha:** 2026-09-15
- **Prompt origen:** `prompt_exploraco_tsk104.md` (verificacion admin + diferenciacion visual de verificados + dashboard con datos reales)
- **ADR:** ADR-029 (DECISIONS.md); consume precedentes ADR-019 (`destinos.verificado`) y ADR-028 (`email_verificado` / `verificar_usuario`)
- **Responsable:** build (orquestador) + backend/admin/qa + docs-keeper

- **Alcance ejecutado (verificado contra archivo real, ADR-006):**

  **Tarea A [`api/usuarios.js`, +45/-6 en el working tree] COMPLETADO:**
  1. **[A1 - auto-verificacion del admin en el upsert]** El INSERT de `usuarios` agrega la columna `email_verificado` (`$7`) y el `ON CONFLICT (auth_id) DO UPDATE` agrega `email_verificado = (COALESCE(usuarios.email_verificado, false) OR EXCLUDED.email_verificado)`. La condicion es `email.toLowerCase() === 'brsk84@gmail.com' || nombre.toLowerCase() === 'javier'`. El `OR` hace la marca idempotente y monotona: nunca desmarca a quien ya estaba verificado.
  2. **[A2 - rama POST `tipo=verificar_usuario`, admin-only]** Guard `esAdminUsuario(req)` -> 401 `'No autorizado'`; 400 si falta `usuario_id`; `UPDATE usuarios SET email_verificado=$1 WHERE id=$2 RETURNING id`; 404 si no hay filas; responde `{ ok, usuario_id, email_verificado }`. El valor enviado es el estado final (idempotente: permite marcar y desmarcar).
  3. **[C1 - `total` en GET `?tipo=leaderboard`]** Se agrega `SELECT COUNT(*)::int AS n FROM usuarios WHERE activo = true` y el campo aditivo `total` a la respuesta `{ ok, data, total }` (no altera `data`).

  **Tarea B [`admin.html`, +42/-8 en el working tree] COMPLETADO:**
  4. **[B - diferenciacion de verificados en `renderTabla()`]** Fila con fondo `#f0fdf4` y borde izquierdo `#22c55e` cuando `p.verificado`; badge `VERIF` tras el nombre. **[B3 - filtro]** Pills `data-verified` + variable `currentVerifiedFilter` + `setVerifiedFilter()` + condicion `if(currentVerifiedFilter === true && !p.verificado) return false` dentro de `filtered`.

  **Tarea C [`admin.html` y `api/utilidades.js`] COMPLETADO:**
  5. **[C1 - tarjeta Usuarios]** `ds-usuarios` deja de usar `st.destinos`; ahora lee el `total` real del leaderboard.
  6. **[C2 - tarjeta Visitas + rama nueva]** `api/utilidades.js` (+24/-0) agrega la rama admin-only GET `?tipo=visitas_global` -> `{ ok, total, v30, v7 }` sobre `interacciones tipo='visita' AND activo=true` (usa `auth(req)`/Bearer). No existia endpoint de visitas globales y NO se creo archivo nuevo (8/8 intacto, ADR-010). `admin.html` consume esa rama para `ds-visitas`.
  7. **[C3 - quinta tarjeta]** Tarjeta `ds-verificados` derivada del array local `places` (`p.verificado === true`). **[C4 - CSS]** `.stats-grid` pasa a `repeat(5,1fr)`.
  8. **[Fix post-sync]** `syncFromNeon()` re-renderiza el dashboard si la pantalla esta activa, para que las tarjetas no queden en 0 en un navegador limpio.

- **Decisiones aprobadas por Javier (2026-09-15):**
  1. La migracion 016 ya estaba aplicada (confirmado segun NEXT.md/ADR-028/`docs/DEPLOY_017.md`); el prompt de tarea la declaraba "pendiente" por error (ADR-006: se confirma contra las fuentes del repo).
  2. C2 se resolvio creando la rama `visitas_global` (no existia endpoint de visitas globales).
  3. Dashboard con 5 tarjetas.
  4. Filtro "Verificados" + badge en la tabla.
  5. A2 usa `esAdminUsuario` + 401 (consistencia con el patron del archivo); el prompt sugeria 403.
  6. El conteo de viajeros entra como campo aditivo `total` en el leaderboard (no se toca `stats` de `api/destinos.js`).

- **Hallazgos QA residuales (no bloqueantes; ver observaciones en BUGS_HISTORICOS.md):**
  - **H4 (riesgo aceptado):** cualquier usuario que se registre con nombre `javier` queda auto-verificado (es el requisito textual del prompt). Riesgo de integridad a revisar.
  - **H6:** `GET ?tipo=leaderboard` es publico y ahora expone `total` (conteo de usuarios) sin Bearer.
  - **H7:** `verificar_usuario` con `usuario_id` no-UUID devuelve 500 (capturado por el try externo) en vez de 400.
  - **H8 (preexistente, fuera de TSK-104):** `api/utilidades.js` tiene un `.catch(function(){})` vacio en la rama `visitas` POST, baseline preexistente no-ASCII (680 bytes >127) y 24 backticks; NINGUNO atribuible a TSK-104 (las lineas nuevas del diff estan limpias).

- **Presupuesto de endpoints:** **8/8 INTACTO** (ADR-010). Cero archivos nuevos en `api/`; todo entra como ramas `tipo=` y ajustes puntuales.

- **Evidencia (ADR-006, contra archivo real):**
  - Header real `api/usuarios.js` v13 al cierre de TSK-104 ("verificacion admin forzada, rama verificar_usuario, total en leaderboard"); nota: el header habia quedado en v9 pese a que el changelog ya documentaba v10-v12 (TSK-103), por eso el salto v9 -> v13. **Nota de version (ADR-006, 2026-09-15): el header real HOY es v14** por el hotfix de login BUG-054 (SQL invalido del merge de `device_hashes`), documentado mas abajo en "Hotfix posterior".
  - `api/utilidades.js` v2 con la rama `visitas_global`; `git diff --stat` = 3 archivos, +105/-14 (`api/usuarios.js` 45, `api/utilidades.js` 24, `admin.html` 50).
  - `esAdminUsuario` existe en `api/usuarios.js` (L180) y A2 lo usa.
  - QA reporta Escudo GOLD PASS (sintaxis, ASCII-safety de lo nuevo, balance de divs). Las lineas agregadas a `api/utilidades.js` no aportan no-ASCII ni backticks.

- **PENDIENTE OPERATIVO (bloqueante para produccion, lo ejecuta Javier):**
  1. **Aplicar `db/migrations/017_perfil_publico_arbol_casas.sql` en Neon** y despues **`018_consumibles_categorias.sql`** (el orden importa: la 018 presupone la 017).
  2. **Commit + push + deploy en un solo release** (incluye los pendientes previos sin commitear de TSK-095..TSK-103 + las migraciones 015/016/017/018).
  3. **Verificacion post-deploy:** A1 (la cuenta admin aparece con `email_verificado=true`), A2 (Bearer valido marca/desmarca; sin Bearer 401; UUID inexistente 404), C1/C2/C3/C4 (las 5 tarjetas con datos reales y sin quedar en 0 en navegador limpio).

- **Fuera de alcance:** correccion de los hallazgos H4/H6/H7/H8 (se documentan, no se corrigen); aplicacion de las migraciones 017/018 (la ejecuta Javier); cambios de codigo posteriores al cierre documental.

- **Bugfix posterior (2026-09-15): regresion colateral de BUG-049 en `refrescarSesion()` -- no previsto en el alcance original de TSK-104.** Detalle completo en `BUGS_HISTORICOS.md` BUG-053.
  - **Sintoma reportado por Javier:** la cuenta `brsk84@gmail.com` (auto-verificada por A1 de esta tarea) tenia `email_verificado = TRUE` en Neon, pero `mi-perfil.html` seguia mostrando el banner "Verifica tu email" y bloqueaba referidos/facciones/casa/DM.
  - **Causa raiz (QA):** `GET /api/usuarios?id=UUID` nunca devuelve `jwt` y, con JWT faltante/expirado, responde la proyeccion publica SIN `email`/`auth_id`/`jwt`/`email_verificado` (`api/usuarios.js`, L500-529; fuga cerrada por BUG-049 / ADR-028). Las dos `refrescarSesion()` REEMPLAZABAN `window.ExploraCO.usuario` (`usuario-session.js`, L1092; `mi-perfil.html`, L854).
  - **Fix (working tree, SIN commitear):** `usuario-session.js` (+21/-4) y `mi-perfil.html` (+19/-4) fusionan la respuesta (`Object.assign({}, actual, d.data)`), conservan `jwt`/`jwt_expira_en` y, ante la proyeccion publica (respuesta sin `email`), no pisan la sesion y llaman `refreshJwt()`/`renovarJwt()`. No quedan asignaciones de sesion alimentadas por GET.
  - **Evidencia (ADR-006):** `git diff --stat` = 2 archivos, +32/-8; `node --check` OK en ambos; delta ASCII 0 en el bloque nuevo; balance de divs de `mi-perfil.html` 0; `scripts/smoke_017_perfil_arbol_casas.js` 73/73 PASS; `scripts/smoke_016_multinivel_crowdsourcing.js` 39/39 PASS; sin recursion.
  - **Estado:** RESUELTO en working tree (2026-09-15); **PENDIENTE commit/push/deploy** y re-login del usuario afectado si su `localStorage` ya perdio `auth_id`/`email`. Repara la regresion colateral de BUG-049 (BUG-049 permanece RESUELTO y sin cambios).
  - **Deuda QA no bloqueante (preexistente, NO de este fix):** `scripts/smoke_test_perfil_progreso.js` espera 22 misiones vs 36 reales; `scripts/smoke_test_epic_prompt.js` espera VOCACIONES 3 vs 4 y `chat_salas` plan vs plan+dm. Ver DQ-1/DQ-2 al final de BUGS_HISTORICOS.md; los smokes NO se actualizan en este cierre.

- **Hotfix posterior (2026-09-15): login 500 por SQL invalido en el merge de `device_hashes` -- no previsto en el alcance original de TSK-104.** Detalle completo en `BUGS_HISTORICOS.md` BUG-054.
  - **Sintoma reportado por Javier:** `POST /api/usuarios` (upsert de login/registro) devolvia 500 para TODOS los logins; error real de Postgres/Neon: `column "t.ord" must appear in the GROUP BY clause or be used in an aggregate function` (SQLSTATE 42803).
  - **Causa raiz:** commit origen `7cc28fe` ("sistema de puntos", 2026-09-14), PREVIO a TSK-104; lo expuso el re-upsert forzado por el fix de sesion (BUG-053), porque `usuario-session.js` envia siempre `device_hash`.
  - **Fix (working tree, SIN commitear):** `api/usuarios.js` (+30/-14; header `v13` -> `v14`) con `jsonb_agg(h ORDER BY ord)` (ORDER BY DENTRO del agregado) y `try/catch` best-effort que loguea con `console.error` y NO re-lanza (el fingerprint nunca bloquea el login).
  - **Evidencia (ADR-006):** header real L2 `v14`; bloque del hotfix L981-1006; `node --check` OK; ASCII/backticks/doble-escape 0/0/0; simulacion runtime con mock `sql`/`neon` 15/15 PASS (200 con `device_hash`; 200 incluso si el UPDATE del fingerprint falla); sin regresion en A1/`verificar_usuario`/`total`; el patron invalido ya no aparece en `api/*.js`.
  - **Estado:** RESUELTO en working tree (2026-09-15); **PENDIENTE OPERATIVO: commit/push/deploy** (login roto en produccion). Ver el pendiente y la verificacion post-deploy en NEXT.md.

---

### TSK-105: Lote "promptarreglos" -- DM 500, galeria duplicada, popover Guardar, "Estuve aqui", unificacion Como llegar/Ubicacion, galeria unificada de destino, seguridad de album y degradacion 503 [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-16, implementada y verificada en working tree). **PENDIENTE OPERATIVO (BLOQUEANTE para cerrar al 100%): aplicar la migracion 004 (`scripts/apply_004_foto_url.js`) + ejecutar `scripts/dedupe_destinos_fotos.js --apply` (dedupe + indice unico) en Neon + commit/push/deploy.**
- **Prioridad:** Alta
- **Fecha:** 2026-09-16
- **Prompt origen:** `promptarreglos.txt`
- **ADR:** ADR-030 (DECISIONS.md); cierra BUG-036 y consume los precedentes ADR-024 (geocerca), ADR-025 (sesion firmada + nonce), ADR-027 (piramide de referidos) y ADR-028 (blindaje PII)
- **Responsable:** build (orquestador) + architect-review + qa + docs-keeper

- **Alcance ejecutado (verificado contra archivo real, ADR-006):**

  1. **BUG-055 - `dm_hilos` 500 (SQLSTATE 42P08).** `api/interacciones.js` L2937-2939 y L2962 castean a texto los usos uuid del parametro ambiguo: `m.usuario_id::text<>$1`, `m2.usuario_id::text=$1` y `bloqueador_id::text=$1 OR bloqueado_id::text=$1`. Causa: `$1` se comparaba contra `split_part(...)` (text) y contra columnas uuid a la vez.
  2. **BUG-056 - foto repetida en la galeria (hostal-r10).** Causa raiz multiple: `destinos_fotos` sin `UNIQUE(destino_id,url)` y sin migracion que la cree, `api/admin-destinos.js` PUT re-insertaba sin borrar, `api/utilidades.js` POST `?tipo=fotos` acumulaba y `admin.html` hacia DOBLE escritura. Fix: semantica REPLACE (dedupe por url + DELETE + reinsert) en `api/admin-destinos.js` PUT/POST (upsert por slug, helper `normFotosGaleria` L43-60, guards 400 en L230/L340-346) y en `api/utilidades.js` POST (L225-234), con guard anti-perdida (lista vacia -> 400 y NO borra); `admin.html` elimina la segunda escritura; `galAll` dedupe defensivo en el render (`api/pagina-destino.js` L727-733).
  3. **BUG-057 - popover "Guardar" cerraba con CUALQUIER click.** `cerrarPopoverGuardar` (`api/pagina-destino.js` L2298) solo cierra si el click es FUERA (`p.contains(ev.target)`) o sobre `#btn-guardar`; `toggleMapaDest` (L2347) muestra error si `!data.ok` y sus `catch` usan `console.warn`.
  4. **BUG-058 - "Estuve aqui" nunca completaba (cierra BUG-036).** `usuario-session.js` solicita `GET ?tipo=geo_nonce_solicitar` (L649-665), envia `Authorization: Bearer` + `nonce`, maneja 401 con `refreshJwt` y reintenta UNA vez con nonce nuevo (L698-767), y traduce `NONCE_*`/`SESION_*`; `obtenerUbicacion` (L602-647) distingue los codigos 1/2/3 y reintenta con baja precision ante 2/3.
  5. **Unificacion "Como llegar" + "Ubicacion".** `api/pagina-destino.js` funde `secTransporteHostal` (id original "como-llegar") y `secMapa` (id original "mapa") en `secComoLlegar` (id="como-llegar", transporte arriba + mapa abajo), con UNA sola entrada de subnav (`{id:'como-llegar', label:'Como llegar'}`) y anclas legacy invisibles `#fotos` y `#mapa`.
  6. **Galeria unificada de destino (ADR-030).** `#galeria` y `#fotos` se fusionan en UNA seccion `id="galeria"` (miniaturas curadas + "Fotos de viajeros" `#fp-grid` + caja `#fp-upload`), con ancla legacy invisible `<span id="fotos">`; nueva UI "Guardar en album" en fotos de viajeros (GET `tipo=albumes` + POST `album_agregar_foto`); helper cliente `galEsc()` (L2379) que escapa HTML y cierra un XSS preexistente del inline. El modulo unificado se muestra SIEMPRE en la ficha.
  7. **BUG-059 - seguridad de album + consistencia de XP.** `album_agregar_foto` valida la propiedad del album (403 `ALBUM_AJENO`, L5143) y tipifica `23503` -> 400 `AUTOR_ORIGINAL_INVALIDO` (L5181); `album_voto` llama `repartirXpReferidos` (L5237), cerrando el gap de la piramide de ADR-027.
  8. **BUG-060 - degradacion del 503 por migracion 004 no aplicada.** Helper `queryConAvatarFallback` (`api/interacciones.js` L2114) degrada `42703` (`usuarios.foto_url` ausente) reintentando con `avatar_url` en `museo_publico` (L2760), `album_detalle` (L3382/L3394) y `galeria_destino` (`gdUsuarios`/`gdViajeros`, L3499/L3542); `api/usuarios.js` hace lo equivalente en `perfil_publico`. Antes eran 503. Mismo patron que BUG-051; causa raiz: migracion 004 nunca aplicada (patron BUG-021).

- **Decisiones de producto (revisadas por architect-review):**
  1. **NO se permite votar fotos curadas en esta entrega:** no se creo el tipo `foto_curada_voto`; `tipo_voto=null` para curadas. Se vota SOLO viajeros (`foto_voto`) y album (`album_voto`). Razon: `destinos_fotos.id` NO es estable (el REPLACE lo re-crea).
  2. **`origen='album'` APAGADO por defecto:** las album_fotos por cercania solo aparecen con `incluir=albumes` en `GET tipo=galeria_destino`.
  3. **`items[]` SOLO se emite si el cliente envia `incluir`** (protege a `galeria.html`, que no lo envia).
  4. **El modulo unificado se muestra SIEMPRE en la ficha** (`scripts/smoke_auditoria_pagina_destino.js` actualizado a 54 checks).
  5. **`autor_original_id` null:** `album_agregar_foto` lo normaliza con `|| usuarioId2` y el dedup se hace por SELECT (no se depende del indice unico, que con NULL no deduplica).

- **Archivos modificados en el working tree (SIN commitear; `git diff --stat` = 8 archivos, +649/-167):**
  - `api/interacciones.js` (271 lineas cambiadas): casts `::text` de DM, `queryConAvatarFallback`, `items[]`/`incluir`, 403/400 de album, `repartirXpReferidos` en `album_voto`.
  - `api/pagina-destino.js` (197 lineas cambiadas): `secComoLlegar`, `#galeria` unificada, UI "Guardar en album" (`abrirAlbumPopover`), `galEsc`, fix del popover.
  - `api/admin-destinos.js` (71 lineas cambiadas): `normFotosGaleria` + REPLACE + guards.
  - `api/utilidades.js` (59 lineas cambiadas): REPLACE en POST `?tipo=fotos`.
  - `api/usuarios.js` (27 lineas cambiadas): fallback de avatar en `perfil_publico`.
  - `usuario-session.js` (127 lineas cambiadas): nonce + Bearer + reintento + geolocation.
  - `admin.html` (8 lineas cambiadas): elimina la doble escritura de la galeria.
  - `scripts/smoke_auditoria_pagina_destino.js` (56 lineas cambiadas): 54 checks.
  - NUEVOS sin versionar: `scripts/apply_004_foto_url.js`, `scripts/dedupe_destinos_fotos.js`.

- **Presupuesto de endpoints:** **8/8 INTACTO** (ADR-001). Cero archivos nuevos en `api/`; todo entra como ramas `tipo=` y helpers.

- **Evidencia (ADR-006, contra archivo real):**
  - Smoke: `node scripts/smoke_auditoria_pagina_destino.js` -> `TODOS LOS SMOKE TESTS PASARON (54 checks)`.
  - `api/interacciones.js` L2114, L2937-2939, L2962, L3382, L3394, L3499, L3542, L5143-5181, L5237; `api/pagina-destino.js` L1521/L1525 (`#galeria` + ancla `#fotos`), L1810 (`secComoLlegar`), L2298, L2347, L2379; `api/admin-destinos.js` L43-60/L230/L340-346.
  - **Nota de version (ADR-006):** los comentarios nuevos de `api/interacciones.js` se rotulan `v16`, pero el header real sigue en `v14` y no se agrego el bloque de changelog `v16`; inconsistencia de version a corregir en el commit.

- **PENDIENTE OPERATIVO (bloqueante para produccion, lo ejecuta Javier; requiere `DATABASE_URL`):**
  1. **`node scripts/apply_004_foto_url.js`** -> aplica `db/migrations/004_usuarios_blog_autor.sql` (`usuarios.foto_url` + `ciudad_base`); cierra de raiz el BUG-060.
  2. **`node scripts/dedupe_destinos_fotos.js --apply`** -> backup + borra duplicados de `destinos_fotos` + `CREATE UNIQUE INDEX idx_destinos_fotos_destino_url`; cierra al 100% el BUG-056.
  3. **Commit + push + deploy en un solo release** (incluye los pendientes previos sin commitear de TSK-095..TSK-104 y las migraciones 015/016/017/018).
  4. **Verificacion post-deploy:** `dm_hilos` 200; "Estuve aqui" completa con nonce+Bearer; popover Guardar conserva checkboxes; galeria sin repetidas; voto de viajeros/album y "Guardar en album" (403 `ALBUM_AJENO` con album ajeno); sin 503 en museo/galeria/albumes/perfil publico; "Como llegar" con transporte + mapa en una sola seccion.

- **Fuera de alcance:** voto de fotos curadas (recorte del MVP, ver decisiones); subida real de archivos; correccion de la doble fila de galeria historica (la hace el script); bump del header `v14` -> `v16` (se corrige en el commit).

---

### TSK-106: Capa multimedia del mapa (filtro por usuario), galeria unificada en `galeria.html` y 12 miniaturas en el hero de la ficha [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-16, implementada y verificada en working tree). **PENDIENTE OPERATIVO: commit/push/deploy** (junto con los pendientes previos de TSK-095..TSK-105).
- **Prioridad:** Alta
- **Fecha:** 2026-09-16
- **Prompt origen:** `PROMPT_MULTIMEDIA_GALERIA.md` (sin versionar en el working tree al cierre).
- **ADR:** DECISIONS.md ADR-030 (actualizado con la decision H-1 y el re-alcance de P3); consume ADR-021 (capa audiovisual estricta), ADR-025 (sesion firmada / nonce) y ADR-028 (blindaje PII). Bug derivado: BUGS_HISTORICOS.md BUG-061 (H-2, no corregido aqui).
- **Responsable:** build (orquestador) + qa + docs-keeper

- **Alcance ejecutado (verificado contra archivo real, ADR-006; `git diff --numstat` = 5 archivos, +243/-56):**

  1. **PROBLEMA 1 - capa multimedia del mapa (`api/interacciones.js` + `index-api-connector.js`).** `GET ?tipo=multimedia_mapa` acepta el filtro opcional `usuario_id` (validado por regex uuid; si el valor es invalido el filtro se IGNORA, nunca se manda texto no-uuid a un cast `::uuid` -> sin 22P02). Con `usuario_id`: rama albumes -> `a.usuario_id=$N::uuid`; rama destinos -> `d.id IN (SELECT i.destino_id FROM interacciones i WHERE i.usuario_id=$N::uuid AND i.tipo IN ('guardado','voto','rating') AND i.activo=true)`. Sin `usuario_id` el SQL publico es byte-identico al anterior (regresion cero). Se reemplazo el calculo fragil de indices del UNION ALL (`(mmTipos?'2':'1')`) por indices capturados al apilar cada parametro (`mmIdxTipos`/`mmIdxCiudad`/`mmIdxUsuario`); si un opcional no viene su indice es null y la clausula no se emite. `index-api-connector.js` deja de enviar `origen=album` y agrega `&usuario_id=<id>` cuando hay sesion (`window.ExploraCO.usuario.id`).
  2. **PROBLEMA 2 - tab audiovisual de "Mi Viaje Personal" (index.html): OMITIDO.** No existe ese tab y NO se construye en TSK-106 (decision explicita del usuario).
  3. **PROBLEMA 3 - galeria unificada: RE-ALCANZADO a `galeria.html`, NO a `comunidad.html`.** `comunidad.html` no tenia la seccion descrita (la galeria unificada real ya vive en `api/pagina-destino.js` `#galeria`). En `galeria.html` (modo destino) queda: aviso "Tienes fotografias de tu viaje?..." + `<input type="url">` + boton que hace `POST /api/interacciones {tipo:'foto', usuario_id, destino_id, url}` + grid unico "Fotos del destino" alimentado con `incluir=viajeros` (se consumen `items[]` del endpoint, con fallback a `fotos[]`+`usuarios[]`). Se elimino `gSeedCard` y la seccion `#g-dest-usuarios`.
  4. **PROBLEMA 4 - hero de la ficha con solo 3 miniaturas (`api/pagina-destino.js`).** El hero pasa de 3 a 12 miniaturas (`HERO_THUMBS_MAX=12`, `galAll.slice(1, HERO_THUMBS_MAX + 1)`); la query de `destinos_fotos` sube `LIMIT 12 -> 24` (material suficiente para `galAll`); el CSS `.prow` pasa de `flex` a `grid` responsivo (6 columnas en desktop, 4 en `<=760px`) y `.pth` pierde el `flex:1`.

- **Decisiones tomadas por el usuario (registradas):**
  1. **P2 OMITIDO:** el tab audiovisual de "Mi Viaje Personal" no existe y no se construye en TSK-106.
  2. **P3 RE-ALCANZADO a `galeria.html`:** aplicado ahi, NO a `comunidad.html`.
  3. **H-1 RESTRICTIVO (confirmado):** con sesion, `usuario_id` RESTRINGE la capa multimedia a lo propio (albumes del usuario + destinos que guardo/voto/califico); no es aditivo. Registrado en ADR-030.
  4. **H-2 -> BUG-061:** `POST tipo='foto'` confia en `body.usuario_id` sin `validarSesion` (spoofable); se registra como bug independiente y NO se corrige en TSK-106 (escalado a `sql-security`).

- **Archivos modificados en el working tree (SIN commitear):**
  - `api/interacciones.js` (+28/-5): filtro opcional `usuario_id` en `multimedia_mapa` + indices capturados del UNION ALL.
  - `index-api-connector.js` (+12/-2): la capa multimedia llama sin `origen=album` y con `usuario_id` si hay sesion.
  - `index.html` (+30/-6): `renderMapaMedia`/`mdMediasCercanas` ya NO descartan `origen==='destino'`; pins de destino en `#1f8a70` con borde punteado (`.mpa-media-pin-dest`), dedupe por `origen_id` (slug) y tope de 300 markers; el drawer titula ambos origenes.
  - `api/pagina-destino.js` (+12/-5): `HERO_THUMBS_MAX=12` + `slice(1,13)`, `LIMIT` de `destinos_fotos` 12 -> 24, `.prow` grid responsivo.
  - `galeria.html` (+161/-38): grid unico "Fotos del destino" + aviso/input/boton de compartir + `gItemCard`/`gDestinoItems`/`gShareFoto`; se eliminan `gSeedCard` y `#g-dest-usuarios`.

- **Presupuesto de endpoints:** **8/8 INTACTO** (ADR-001 / ADR-010). Cero archivos nuevos en `api/`.

- **Evidencia (ADR-006, contra archivo real):**
  - `node --check` OK en `api/interacciones.js`, `api/pagina-destino.js` e `index-api-connector.js`.
  - ASCII-safety: 0 bytes >127 en los 3 archivos JS tocados (`index-api-connector.js` no es `api/*`, pero tambien quedo en 0).
  - Smoke: `node scripts/smoke_auditoria_pagina_destino.js` -> `TODOS LOS SMOKE TESTS PASARON (54 checks)`.
  - `api/interacciones.js` L3719-3745 (validacion uuid + `mmIdx*`) y L3758-3775 (clausulas del UNION ALL); `api/pagina-destino.js` L745 (`HERO_THUMBS_MAX`) y L2524 (`LIMIT 24`); `index.html` `mapaMediaIcon`/`renderMapaMedia`/`mdMediasCercanas`/`openMapaMediaDrawer`; `galeria.html` `gDestinoItems`/`gItemCard`/`gShareFoto`.

- **Pendiente operativo:** **commit + push + deploy** de los 5 archivos en un solo release con los pendientes previos (TSK-095..TSK-105 + migraciones 015/016/017/018 y los scripts de la 004). Verificacion funcional post-deploy segun `PROMPT_MULTIMEDIA_GALERIA.md` seccion 5.

- **Hallazgo derivado (H-2 -> BUG-061):** `POST /api/interacciones` `tipo='foto'` (`api/interacciones.js` ~L5024-5035) usa `body.usuario_id` (`var usuarioId2= body.usuario_id || null;`, L4136) sin `validarSesion` (definida en L1911) -> suplantacion de autor. Preexistente; expuesto por la UI nueva de `galeria.html`. Severidad MEDIA; escalado a `sql-security`.

- **Hallazgo H-3 (no corregido):** `scripts/smoke_auditoria_pagina_destino.js` IGNORA el slug que se le pasa por `process.argv` (el prompt sugeria `node scripts/smoke_auditoria_pagina_destino.js hostal-r10`); el script no lee `process.argv` y valida solo datos minimos embebidos.

- **Higiene de working tree:** hay 3 archivos BORRADOS en el working tree ajenos a TSK-106 (`PROMPT.md`, `prompt_exploraco_tsk104.md`, `promptarreglos.txt`) que NO deben colarse en el commit de TSK-106.

- **Fuera de alcance:** tab audiovisual de "Mi Viaje Personal" (P2, omitido); correccion de H-2/BUG-061 (escalada a `sql-security`); correccion del smoke H-3; `comunidad.html` (no se toca).

---

### TSK-107: Capa de media del mapa (album de destino + visibilidad publica), guardados de media + area museo del perfil, y radio de verificacion por lugar para "Estuve aqui" [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-17, implementada en working tree, SIN commitear). **PENDIENTE OPERATIVO (BLOQUEANTE): aplicar `db/migrations/019_media_guardados_radio.sql` en Neon + commit/push/deploy + verificacion en vivo del caso `hostal-r10-bogota`.**
- **Prioridad:** Alta
- **Fecha:** 2026-09-17
- **ADR:** DECISIONS.md ADR-031 + ADR-032 + ADR-033.
- **Responsable:** build (implementacion) + docs-keeper.
- **Bug relacionado:** BUGS_HISTORICOS.md BUG-061 (`POST tipo='foto'` sin `validarSesion`) sigue ABIERTO y no se corrige en esta tarea.

- **Alcance ejecutado (verificado contra archivo real, ADR-006; `git diff --shortstat` = 7 archivos, +591/-53 + 1 migracion nueva sin versionar):**

  1. **ADR-031 - capa de media del mapa.** (a) Fix del 503 `SCHEMA_NOT_MIGRATED`: la consulta de `multimedia_mapa` se envuelve en `queryConAvatarFallback` (`api/interacciones.js` L3775), que degrada `42703` (`usuarios.foto_url` ausente, migracion 004) a `avatar_url`; antes el error escalaba al catch global. (b) Fila agregada por destino `origen='destino_album'` (portada via `ARRAY_AGG(... es_hero DESC NULLS LAST, orden ASC NULLS LAST)[1]` + `fotos_count`) ADEMAS de las fotos individuales `origen='destino'` (L3830-3865). (c) Relajacion del filtro restrictivo H-1/ADR-021: la capa publica ya no se restringe por sesion; el filtro solo aplica con `scope=mio` (si no viene, `mmUsuarioId=null`, L3745-3756). Frontend: toggle "Solo mio" (`index.html` `#mm-solo-mio` L1234 -> `setMapaMediaSoloMio`; `index-api-connector.js` agrega `&scope=mio&usuario_id=` solo con toggle activo + sesion, L350-387).
  2. **ADR-032 - guardados (bookmarks) de media + area museo del perfil.** Migracion 019 crea `media_guardados(usuario_id, fuente, item_id, activo, creado_en, PK(usuario_id,fuente,item_id))` con `CHECK fuente IN ('album','album_foto','viajero_foto')` y sin FK polimorfica (integridad validada en backend). Ramas nuevas en `api/interacciones.js`: GET `mis_fotos` (L3899), GET `mis_guardados_media` (L3929, degrada a lista vacia si falta la 019), POST `guardar_media`/`quitar_guardado_media` (L5476-5533, con 503 `SCHEMA_NOT_MIGRATED` explicito si falta la tabla). Visibilidad: fotos subidas y albumes creados = publicos (museo publico `perfil.html` "Sala V: Fotos", `+60/-3`); guardados = privados (solo `mi-perfil.html` `#mis-guardados-media-grid`, `+109/-0`). Sin endpoints nuevos (8/8, ADR-001).
  3. **ADR-033 - radio de verificacion por lugar.** Migracion 019 agrega `destinos.radio_m integer` con CHECK 25..100000 (NULL = heuristica 100/150/200/250 de ADR-024). `resolverRadioM(categoria, tags, nombre, radioExplicito)` prioriza el radio explicito (`api/interacciones.js` L160-182). Escalado de XP por amplitud: `factorXpPorRadio` con `RADIO_XP_MEDIO_M=1000` (50% XP) y `RADIO_XP_CERO_M=5000` (0 XP); la visita SIEMPRE se registra y marca el mapa (L137-148, L6844-6848). Solo el admin define el radio: `api/admin-destinos.js` acepta `radio_m` en POST/PUT (+16/-3) y `admin.html` expone `#f-radio-m` (+51/-1).

- **Archivos en el working tree (SIN commitear; verificados con `git diff --numstat`):**
  - `api/interacciones.js` (212/14): ADR-031 + ADR-032 + ADR-033.
  - `index.html` (89/3): toggle "Solo mio".
  - `index-api-connector.js` (57/31): wiring `scope=mio`.
  - `mi-perfil.html` (109/0): "Mis fotos" + "Mis guardados".
  - `perfil.html` (60/3): "Sala V: Fotos" publica (solo lectura, sin guardados).
  - `admin.html` (51/1): campo `#f-radio-m` + presets + carga/guardado.
  - `api/admin-destinos.js` (16/3): `radio_m` en SELECT/INSERT/UPDATE.
  - NUEVO sin versionar: `db/migrations/019_media_guardados_radio.sql` (65 lineas, aditiva, idempotente ADR-008, ASCII-safe ADR-002).

- **Presupuesto de endpoints:** **8/8 INTACTO** (ADR-001). Cero archivos nuevos en `api/`.

- **Evidencia (ADR-006, verificacion documental contra archivo real, 2026-09-17):**
  - Existe `db/migrations/019_media_guardados_radio.sql`; contiene `destinos.radio_m` + `destinos_radio_m_check` + tabla `media_guardados` + 2 indices.
  - `api/interacciones.js`: `factorXpPorRadio` L143, `resolverRadioM` L164, `queryConAvatarFallback` en `multimedia_mapa` L3775, `destino_album` L3832/L3861, `scope=mio` L3745/L3756, `mis_fotos` L3899, `mis_guardados_media` L3929, `guardar_media`/`quitar_guardado_media` L5476, `resolverRadioM(destVisita...)` L6833.
  - `mi-perfil.html`: `#mis-fotos-grid` L553, `#mis-guardados-media-grid` L559, `cargarMisFotos` L1758, `cargarMisGuardadosMedia` L1779, `quitarGuardadoMedia` L1800.
  - `perfil.html`: `pfFotos`/`pfCargarFotos` (Sala V).
  - `admin.html`: `#f-radio-m` L1713, `radio_m` en `_placeToAPI` L3822, en carga L6008/L6527.
  - **NO se ejecutaron smokes ni `node --check` en esta sesion documental** (no se reportan resultados de pruebas no corridas). La QA funcional queda pendiente de la verificacion en vivo post-deploy.

- **PENDIENTE OPERATIVO (bloqueante, lo ejecuta Javier; requiere Neon):**
  1. **Aplicar `db/migrations/019_media_guardados_radio.sql` en Neon** (archivo COMPLETO en una corrida; idempotente). Verificar `destinos.radio_m`, `destinos_radio_m_check`, `media_guardados` y los 2 indices.
  2. **Commit + push + deploy en un solo release** junto con los pendientes previos sin commitear (TSK-095..TSK-106 + migraciones 015/016/017/018 + scripts de la 004).
  3. **Verificacion en vivo:** caso `hostal-r10-bogota` (slug, coords 4.598835,-74.072662, status published) aparece en el mapa con pin de album; capa publica por defecto y "Solo mio" con sesion; `mis_fotos`/`mis_guardados_media` en perfil; radio de "Estuve aqui" con un `radio_m` explicito (XP 50% > 1 km y 0 > 5 km).

- **Hallazgos / pendientes derivados:**
  - **Sin UI de alta de bookmark:** no se encontro consumidor de `guardar_media` en el working tree; solo `quitar_guardado_media`. El area "Mis guardados" del perfil se puede poblar unicamente por API directa hasta que exista el marcador en galeria/ficha (el texto vacio de `mi-perfil.html` ya lo menciona).
  - **BUG-061 ABIERTO:** `POST tipo='foto'` sigue confiando en `body.usuario_id` sin `validarSesion` (escalado a `sql-security`); el flujo de `mis_fotos`/`guardar_media` convive con el.
  - **Nota de version (ADR-006):** `api/interacciones.js` mantiene header `v14` mientras los comentarios nuevos se rotulan `v17` (la migracion 019 tambien cita `v17`); inconsistencia a resolver en el commit.
  - **Rebote a revisar:** con `radio_m > 5000` la XP base de visita es 0, pero el bono rural plano de ADR-024 (+20) sigue sumando.
  - **`perfil.html` no muestra guardados** por diseno (privados); su "Sala V: Fotos" consume `mis_fotos` del dueno del museo.

- **Fuera de alcance:** BUG-061 (escalado a `sql-security`); UI de alta de bookmark (`guardar_media` sin consumidor); checkin de Activos Ocultos (mantiene su heuristica propia, no usa `radio_m`); verificacion en vivo (post-deploy).

---

### TSK-108: Ficha de destino -- hero de 4 fotos, `destinos.sintro` curada, galeria 1+12 y `galeria.html` con 4 secciones + orden de modulos por hostal [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-17, implementada en working tree, SIN commitear). **PENDIENTE OPERATIVO (BLOQUEANTE): aplicar `db/migrations/020_destinos_sintro.sql` en Neon (editor SQL, archivo COMPLETO, patron BUG-021) ANTES del deploy; despues, commit/push/deploy de los 6 archivos.**
- **Prioridad:** Alta
- **Fecha:** 2026-09-17
- **ADR:** DECISIONS.md ADR-034 (nuevo); ADR-030 queda actualizado (hero de 12 a 4 fotos y CTA "Ver galeria" retirado solo del hero).
- **Responsable:** build (implementacion) + docs-keeper (cierre documental).
- **Bug derivado:** BUGS_HISTORICOS.md BUG-062 (`addPhotoFieldWithUrl` usa `photo-url-input` y `getPhotos()` recolecta `.photo-url-inp`): DETECTADO, PENDIENTE, no corregido aqui.

- **Alcance ejecutado (verificado contra archivo real, ADR-006; `git diff --numstat` = 6 archivos, +663/-95, mas 1 migracion nueva sin versionar):**

  1. **Hero de 4 fotos.** `HERO_THUMBS_MAX=3` (1 grande `foto_hero` + 3 miniaturas): 2a foto curada por orden, viajero mas votado y album mas votado; faltantes rellenados con curadas restantes y luego comunidad, con dedup por URL (`api/pagina-destino.js` L776-805). Se ELIMINA el CTA "Ver galeria" del hero; el del `gstrip` se CONSERVA. Botonera: `Sitio web -> Contactar (WhatsApp o mailto) -> Como llegar -> Guardar -> Estuve aqui` (L2269-2277). Sin votacion nueva: se leen `interacciones.dims->>'voto_foto_id'` (viajero) y `album_votos` (album).
  2. **`destinos.sintro`.** Migracion 020 agrega la columna TEXT nullable (16 lineas, idempotente ADR-008, ASCII-safe ADR-002). Persistida normalizada por `normSintro` en `api/admin-destinos.js` (SELECT/INSERT/UPDATE) y aceptada por `api/publicar-lugar.js`; editable en `admin.html` (`#f-sintro`, max 200, tab GENERAL). Render con fallback a los 150 chars de `descripcion` o `highlight` (L860-868).
  3. **Galeria de la ficha 1+12.** 1 grande aparte + 12 miniaturas (6 curadas + 6 comunidad por votos DESC, dedup URL); si faltan de comunidad se completan con curadas; 4/2/1 columnas (escritorio/tablet/movil). `GAL_THUMBS_MAX=12`, `GAL_CURADAS_MAX=6`, `GAL_COMUNIDAD_MAX=6` (L1573-1608; CSS L311-313).
  4. **`galeria.html` modo destino con 4 secciones + subida.** "Fotos del destino" (curadas), "Fotos de la comunidad", "Albumes del destino" y "Mapas con este destino" (`.g-sec`, L150-205), mas el bloque `#g-share`; consume `tipo=galeria_destino&incluir=viajeros,albumes` (L627) y la rama nueva `tipo=mapas_de_destino` (L676).
  5. **Rama `mapas_de_destino`.** `GET /api/interacciones?tipo=mapas_de_destino&destino_id=<uuid>` (o `&slug=`): validacion de formato (400) y existencia (404); visibilidad `m.publico=true OR m.usuario_id=viewer`, con `viewer` derivado de `validarSesion` (ADR-025) y `null` sin sesion valida (L2731-2767). Cero endpoints nuevos (8/8, ADR-001).
  6. **Orden de modulos SOLO hostal.** `tags.orden_modulos` (array de ids); default nuevo: Reservar tras Habitaciones/Precios y Contacto tras Como llegar (`SEC_HOSTAL_DEFAULT` L2179; `HOSTAL_MODULOS_ORDEN_DEFAULT` admin L3183). Admin reordena con flechas los modulos del hostal y la lista de Actividades (`_renderHostalModulos`; el orden del array `tags.actividades` ES el orden). Array ausente/vacio/invalido deja el default; ids no listados se agregan al final (cero regresion).

- **Archivos en el working tree (SIN commitear; verificados con `git diff --numstat`):**
  - `api/pagina-destino.js` (+283/-65): hero 4 fotos, `sintro`, galeria 1+12, orden de modulos de hostal.
  - `api/interacciones.js` (+46/-0): rama GET `mapas_de_destino`.
  - `api/admin-destinos.js` (+19/-3): `sintro` en SELECT/INSERT/UPDATE + `normSintro`.
  - `api/publicar-lugar.js` (+12/-2): `sintro` en el INSERT publico (draft).
  - `admin.html` (+150/-5): `#f-sintro`, `HOSTAL_MODULOS_ORDEN_DEFAULT`, reorden por flechas, `tags.orden_modulos`.
  - `galeria.html` (+153/-20): 4 secciones + bloque de subida + `mapas_de_destino`.
  - NUEVO sin versionar: `db/migrations/020_destinos_sintro.sql` (16 lineas, idempotente ADR-008, ASCII-safe ADR-002).

- **Presupuesto de endpoints:** **8/8 INTACTO** (ADR-001). Cero archivos nuevos en `api/`.

- **Evidencia (ADR-006, verificacion documental contra archivo real, 2026-09-17):**
  - `db/migrations/020_destinos_sintro.sql` existe (untracked) y contiene `ALTER TABLE destinos ADD COLUMN IF NOT EXISTS sintro TEXT;`.
  - `api/pagina-destino.js`: `HERO_THUMBS_MAX=3` L776, `sobreIntro` con `d.sintro` L865, `SEC_HOSTAL_DEFAULT` L2179, `GAL_THUMBS_MAX=12` L1577, `.gal-thumbs` 4/2/1 L311-313, botonera sin "Ver galeria" L2269-2277, "Ver galeria" solo en gstrip L848.
  - `api/interacciones.js`: rama `mapas_de_destino` L2731; `validarSesion` en L2752.
  - `api/admin-destinos.js`: `normSintro` L22, `sintro` L111/L159/L215/L315-319. `api/publicar-lugar.js`: `normSintro` L56, `sintro` L157/L198.
  - `admin.html`: `#f-sintro` L917, `HOSTAL_MODULOS_ORDEN_DEFAULT` L3183, `photo-url-inp` L4644/L4656/L4675 vs `photo-url-input` L4149/L4159 (BUG-062).
  - `galeria.html`: 4 secciones `.g-sec` L150-205, `incluir=viajeros,albumes` L627, `mapas_de_destino` L676.
  - **NO se ejecutaron smokes ni `node --check` en esta sesion documental** (no se reportan resultados de pruebas no corridas). La QA funcional queda pendiente de la verificacion en vivo post-deploy.

- **PENDIENTE OPERATIVO (bloqueante, lo ejecuta Javier; requiere Neon):**
  1. **Aplicar `db/migrations/020_destinos_sintro.sql` en Neon** (editor SQL, archivo COMPLETO en una corrida; idempotente). Verificar que `destinos.sintro` existe antes de desplegar: sin ella, guardar un destino desde el admin o `publicar-lugar` falla por columna inexistente (patron BUG-021).
  2. **Commit + push + deploy de los 6 archivos** (`api/pagina-destino.js`, `api/interacciones.js`, `api/admin-destinos.js`, `api/publicar-lugar.js`, `admin.html`, `galeria.html`) en un solo release junto con los pendientes previos sin commitear (TSK-095..TSK-107 + migraciones 015/016/017/018/019 + scripts de la 004). NO mezclar los 3 archivos borrados ajenos.
  3. **Verificacion en vivo:** hero con 4 fotos y sin CTA "Ver galeria" en la ficha (y con el CTA conservado en el gstrip); `sintro` curado visible en "Sobre este lugar"; galeria 1+12 con curadas + comunidad; `galeria.html?destino=<slug>` con las 4 secciones (incluida "Mapas con este destino"); orden de modulos hostal reordenado por flechas en admin.

- **Hallazgos / pendientes derivados:**
  - **BUG-062 DETECTADO:** fotos agregadas por Unsplash no se recolectan con `getPhotos()` en `admin.html` (clase `photo-url-input` vs `.photo-url-inp`); no corregido en esta entrega.
  - **Migracion 020 pendiente (BLOQUEANTE):** el render degrada con fallback, pero la escritura de `sintro` falla hasta aplicar la columna.
  - **Nota de version (ADR-006):** `api/interacciones.js` mantiene header `v14` mientras los comentarios citan `v17`; deuda documental a resolver en el commit.
  - **Sin UI de alta de bookmark (`guardar_media`):** siguen los pendientes de TSK-107 (no relacionados con esta tarea).

- **Fuera de alcance:** BUG-062 (solo registrado); BUG-061 (escalado a `sql-security`); UI de alta de bookmark (`guardar_media`); verificacion en vivo (post-deploy).

---

### TSK-109: XP decimal (`numeric(12,2)`), pestana "Clase" consolidada y rankings de comunidad (Casas/Facciones/Parches) [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-17, implementada en working tree, SIN commitear). **PENDIENTE OPERATIVO (BLOQUEANTE): aplicar `db/migrations/021_xp_decimal.sql` en Neon (la aplica Javier) ANTES del deploy del backend; despues, commit/push/deploy en 2 releases (backend + 021 primero, frontend despues). Checklist: `docs/DEPLOY_021.md`.**
- **Prioridad:** Alta
- **Fecha:** 2026-09-17
- **ADR:** DECISIONS.md ADR-035 (redactado por architect como contrato de diseno; esta tarea lo implementa; NO se duplica aqui).
- **Responsable:** build (implementacion) + docs-keeper (cierre documental).
- **Bugs relacionados:** BUGS_HISTORICOS.md BUG-042 (formula de nivel oculta en `album_crear`) pasa a **CORREGIDO**; BUG-063 (NUEVO, guarda de fama `famaBase < 1` que subcontaba los Parches) queda **CORREGIDO**.

- **Alcance ejecutado (verificado contra archivo real, ADR-006; `git diff --numstat` = 10 archivos de codigo, +700/-282, mas 1 migracion nueva y 1 script de preflight sin versionar; `DECISIONS.md` +249/-1 lo agrego architect):**

  1. **Objetivo 1 - XP decimal (`numeric(12,2)`).** Migracion nueva `db/migrations/021_xp_decimal.sql` (121 lineas, idempotente ADR-008, ASCII-safe ADR-002): un solo bloque `DO $$` con guard `information_schema` que convierte 9 columnas de XP de entero a `numeric(12,2)` usando `format('%I')`; sin `ADD COLUMN` de nada no versionado y **sin indices** (los rankings son agregados sobre tablas pequenas). Preflight read-only `scripts/verify_021_precheck.js` (149 lineas; solo `information_schema` + `MIN/MAX/COUNT`; falla si falta una columna obligatoria; `interacciones.xp_ganado` es opcional). Backend: `api/usuarios.js` (header `v15`), `api/interacciones.js` (header `v18`), `api/admin.js` y `api/pagina-destino.js` (header `v10`) normalizan `numeric`->`Number` en el borde de lectura, redondean half-up a 2 decimales (helper `red2`/`redondearXp`) y ya NO castean `::int` las sumas de XP. Frontend: helper canonico `window.ExploraCO.fmtXp`/`redondearXp` en `usuario-session.js` (formato `es-CO` a 2 decimales con `Number.EPSILON`), aplicado en `index.html`, `admin.html`, `perfil.html`, `mi-perfil.html` y `comunidad.html`.
  2. **Bug latente corregido (BUG-042).** `api/interacciones.js` usaba `Math.floor(xp_total / 100) + 1` como gate de nivel en `album_crear`; ahora usa `calcularNivelLocal(...).nivel` (L5379). La formula oculta se habia registrado como BUG-042 el 2026-09-14 y queda cerrada aqui.
  3. **Bug de subconteo corregido (BUG-063, NUEVO).** La guarda de fama de Parche `if (famaBase < 1) return false;` descartaba aportes legitimamente menores a 1 XP; pasa a `if (famaBase <= 0) return false;` (`api/interacciones.js` L1880-1881) para acreditar micro-fama decimal.
  4. **Objetivo 2 - pestana "Clase" consolidada** (`mi-perfil.html`): el Arbol de Clases es el componente unico. "Tabla de Destino" pasa a sub-vista `senderos` (pseudo-tab interno del arbol, L2621-2622 y L2707-2708); "Tu Faccion" pasa a cabecera del arbol (panel colapsable); "Vocaciones de Artista" se integra en la sub-vista de la faccion `artistas` con boton inline "Activar vocacion" (L2859); "Mi Casa" queda como bloque compacto dentro de `data-tab="clase"` (L698-699). IDs/funciones conservados para no romper smokes.
  5. **Objetivo 3 - rankings de comunidad** (`comunidad.html`, tab Ranking con 4 sub-vistas Viajeros | Casas | Facciones | Parches, L372-386 y `setRankingVista` L1661): `GET /api/usuarios?tipo=casa_ranking` existia SIN UI, ahora agrega `miembros_activos` (activo=true AND `ultimo_acceso > NOW() - 30 days`) y ordena por `xp_total DESC` (total de la casa, ya no promedio); la UI muestra XP total, activos y promedio (`api/usuarios.js` L510-557). Nueva rama `GET /api/interacciones?tipo=pandilla_ranking` (NUEVO, sin archivo nuevo: presupuesto 8/8 intacto) con parches globales ordenados por `fama_total DESC` mas miembros/miembros activos (`api/interacciones.js` L4257-4284). El ranking de facciones se movio del tab "Activo Oculto" al tab Ranking (sub-vista Facciones, `verRankingFacciones` L2144-2146); en Wayfarer queda un CTA que redirige. Definicion "miembro activo vigente" = `usuarios.activo=true` AND `ultimo_acceso` en los ultimos 30 dias, con fallback `42703` si las columnas no existen (patron BUG-021).

- **Archivos en el working tree (SIN commitear; `git diff --numstat`):**
  - `api/interacciones.js` (+185/-98): redondeo half-up, `parseFloat`/`Number` en columnas XP, rama `pandilla_ranking`, fix del gate de `album_crear` y de la guarda de fama.
  - `api/usuarios.js` (+102/-40): `calcularNivel`/`conNivel` normalizados, `casa_ranking` con `miembros_activos` y orden por `xp_total DESC`, rankings sin `::int`.
  - `comunidad.html` (+195/-43): tab Ranking con 4 sub-vistas (Viajeros/Casas/Facciones/Parches), consumo de `casa_ranking`/`pandilla_ranking`, facciones fuera de "Activo Oculto".
  - `mi-perfil.html` (+101/-50): pestana "Clase" consolidada (arbol + senderos + vocaciones inline + Mi Casa compacto).
  - `usuario-session.js` (+39/-19): helper `window.ExploraCO.fmtXp`/`redondearXp` (L46-60) y acreditaciones en cliente normalizadas.
  - `api/admin.js` (+29/-14): `precio_xp` acepta decimales (`parseFloat` + redondeo), listado de resenas normalizado y `repartirXpReferidos` sincronizado.
  - `admin.html` (+20/-9): display de XP con `fmtXp` y precio decimal en la tienda.
  - `index.html` (+15/-5): `getLevel`/`statsU` con `parseFloat` + `fmtXp` (fallback local L4233-4234).
  - `perfil.html` (+9/-1): XP del museo publico normalizado.
  - `api/pagina-destino.js` (+5/-3): espejo cliente de `xp_total` al publicar/votar foto usa `Number` (header `v10`).
  - NUEVOS sin versionar: `db/migrations/021_xp_decimal.sql` (121 lineas, idempotente ADR-008, ASCII-safe ADR-002) y `scripts/verify_021_precheck.js` (preflight read-only).

- **Presupuesto de endpoints:** **8/8 INTACTO** (ADR-001). Cero archivos nuevos en `api/`; `pandilla_ranking` entra como rama `?tipo=` y `casa_ranking` ya existia.

- **Evidencia (ADR-006, verificada en esta sesion documental el 2026-09-17):**
  - Existen `db/migrations/021_xp_decimal.sql` y `scripts/verify_021_precheck.js` (ambos untracked); `docs/DEPLOY_021.md` fue creado por este cierre documental.
  - Headers reales: `api/usuarios.js` v15, `api/interacciones.js` v18, `api/pagina-destino.js` v10.
  - Anclas reales: `api/interacciones.js` L1880-1881 (`famaBase <= 0`), L5379 (`calcularNivelLocal(...).nivel` en `album_crear`), L4257-4284 (rama `pandilla_ranking` + fallback `42703`); `api/usuarios.js` L468-549 (`miembros_activos` y orden en `casa_ranking`, fallback `42703`); `usuario-session.js` L46-60 (`redondearXp`/`fmtXp`); `comunidad.html` L372-386 (`rk-chip` de las 4 sub-vistas) y L1661 (`setRankingVista`); `mi-perfil.html` L463 (tab `clase`), L698-699 (Mi Casa), L2621-2622/L2707-2708 (sub-vista `senderos`), L2859 ("Activar vocacion" inline).
  - `node --check` **6/6 OK**: `api/usuarios.js`, `api/interacciones.js`, `api/admin.js`, `api/pagina-destino.js`, `usuario-session.js` y `scripts/verify_021_precheck.js`.
  - ASCII-safe verificado por buffer: 0 bytes >127 y 0 backticks en `api/usuarios.js`, `api/interacciones.js`, `api/admin.js`, `api/pagina-destino.js`, `db/migrations/021_xp_decimal.sql` y `scripts/verify_021_precheck.js`.
  - Smokes re-ejecutados en esta sesion: `smoke_test_gamificacion_v4.js` 95/95 PASS; `smoke_test_comunidad.js` OK; `smoke_test_perfil_progreso.js` OK; `smoke_test_milestones_v2.js` OK; `scripts/check_buildHTML_inline.js` TODO OK (divs 361/361). `smoke_test_epic_prompt.js` mantiene **4 FAIL PRE-EXISTENTES** (53 checks, 49 PASS; vocaciones 3 vs 4 y `chat_salas` tipo plan) ajenos a esta entrega.

- **PENDIENTE OPERATIVO (bloqueante, lo ejecuta Javier; requiere Neon):**
  1. **Aplicar `db/migrations/021_xp_decimal.sql` en Neon** (archivo COMPLETO en una corrida; idempotente). Preflight opcional read-only: `$env:DATABASE_URL="postgresql://..."; node scripts/verify_021_precheck.js`. Verificar `data_type='numeric'`, `numeric_precision=12` y `numeric_scale=2` en las 9 columnas (bloque comentado al final del .sql).
  2. **Deploy en 2 releases:** backend + 021 primero, frontend despues. Si el backend decimal se despliega SIN la 021, Postgres redondea por cast de asignacion en silencio (sin 500).
  3. **Verificacion en vivo:** elegir faccion/casa; ranking de Casas con activos; ranking de Parches; un XP con decimales mostrado como "125,50 XP".
  4. **Rollback (solo emergencia):** `TYPE integer USING ROUND(col)::integer` es EXACTO mientras no haya decimales acumulados y LOSSY despues; se documenta como `021_xp_decimal_down.sql`, fuera del flujo normal.

- **Hallazgos / pendientes derivados:**
  - **Deuda de columnas no versionadas (patron BUG-021):** `usuarios.ultimo_acceso`, `usuarios.activo` e `interacciones.xp_ganado` siguen sin migracion versionada; los rankings dependen de las dos primeras y la 021 las cubre con guard `IF EXISTS`; el fallback `42703` esta implementado (reintento sin la condicion + `console.warn`, nunca catch vacio).
  - **Backlog:** indices de apoyo para los rankings; normalizar `api/pagina-destino.js` si quedara algun espejo de XP; fusionar `repartirXpReferidos` duplicado (`api/interacciones.js` y `api/admin.js`) si se decide; resolver el drift de `smoke_test_epic_prompt.js`.
  - **Nota documental (ADR-006):** ADR-035 declara en su campo Estado "NO implementado aun" (se redacto como contrato antes de la implementacion); el estado real HOY es implementado en working tree. Queda como deuda de actualizacion del ADR, fuera del alcance de este cierre (DECISIONS.md no se toca aqui, por instruccion explicita).

- **Fuera de alcance:** indices de ranking; fusion de `repartirXpReferidos`; `smoke_test_epic_prompt.js` (deuda QA preexistente); BUG-061 (`POST tipo='foto'` sin `validarSesion`, escalado a `sql-security`); BUG-062 (fotos Unsplash en `admin.html`); verificacion en vivo (post-deploy).

---

### TSK-110: Compartir social con XP por primer share + interacciones de media unificadas (votos/comentarios/guardados) [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-17, implementada en working tree, SIN commitear). **PENDIENTE OPERATIVO (BLOQUEANTE): aplicar `db/migrations/022_media_compartidos.sql` y `db/migrations/023_interacciones_media_unificadas.sql` en Neon (las aplica Javier; archivo COMPLETO en una corrida) ANTES del deploy del backend v19; despues, commit/push/deploy de los 8 archivos modificados + 5 nuevos en un solo release.**
- **Prioridad:** Alta
- **Fecha:** 2026-09-17
- **ADR:** DECISIONS.md ADR-036 (redactado por architect con la decision de producto; esta tarea documenta su implementacion; NO se duplica la decision aqui).
- **Responsable:** build (implementacion) + docs-keeper (cierre documental).
- **Precedencia:** continua a TSK-109 / ADR-035 (XP decimal `numeric(12,2)`); `media_votos.xp_ganado` nace `numeric(12,2)`.
- **Relacion con bugs:** no cierra BUG-061 (la rama nueva `compartir` SI exige `validarSesion`; `tipo='foto'` sigue ABIERTO y escalado a `sql-security`). Abre la deuda de esquema base registrada en BUGS_HISTORICOS.md (seccion "Deuda ADR-036").

- **Alcance ejecutado (verificado contra archivo real, ADR-006; `git diff --numstat` = 8 archivos de codigo, +1379/-536, mas 5 archivos nuevos sin versionar):**

  1. **Migracion 022 - `db/migrations/022_media_compartidos.sql` (131 lineas, idempotente ADR-008, ASCII-safe ADR-002).** Tabla `media_compartidos` (ledger de comparticiones) con CHECK de `fuente` (`destino|curada|viajero_foto|album_foto`), CHECK de `canal` (`web_share|whatsapp|copiar|otro`), `item_id text` 1..64, `xp_ganado numeric(12,2)` y **indice unico PARCIAL `media_compartidos_primero_uq (usuario_id,fuente,item_id) WHERE es_primero = true`** (habilita el `ON CONFLICT ... WHERE es_primero = true DO NOTHING` del backend). **NO toca el CHECK de `interacciones.tipo`** (`'compartir'` no entra a `interacciones`). Incluye preflight read-only (confirmar el CHECK legacy, el indice parcial y una prueba del `ON CONFLICT` en transaccion con ROLLBACK) y un PLAN B documentado (tabla `media_compartidos_unicos`) por si esa version de Postgres no infiere el indice parcial.
  2. **Migracion 023 - `db/migrations/023_interacciones_media_unificadas.sql` (408 lineas, idempotente ADR-008, ASCII-safe ADR-002).** Tablas `media_votos` (PK compuesta `usuario_id,fuente,item_id`, soft-delete `activo`, `xp_ganado numeric(12,2)`), `media_comentarios` (lista de adyacencia `parent_id`, tombstone `activo`, texto 1..1000) y `media_comentario_likes` (PK compuesta, sin XP); `ALTER media_guardados.item_id uuid -> text` (`USING item_id::text`, valores preservados) + CHECK de `fuente` ampliado con `'curada'` (busca/dropea/recrea la constraint real por definicion, sin asumir el nombre); backfill idempotente desde `album_votos` (5.1), `interacciones tipo='foto'` con `dims.voto_foto_id` (5.2, regex de id seguro), `album_comentarios` por niveles con tope 50 (5.4) y `album_comentario_votos` (5.3), todo `ON CONFLICT DO NOTHING`. **Cero DROP/DELETE/TRUNCATE de las tablas legacy.** Preflight 6.1-6.5 (tipo real de `destinos_fotos.id`, conteos legacy vs unificados, idempotencia, tipos de `item_id`, CHECK de `media_guardados`).
  3. **Backend `api/interacciones.js` (header `v18` -> `v19`, +949/-425).**
     - **Rama POST `compartir`:** exige `validarSesion` (ADR-025), valida fuente/canal/item y existencia real (404); **25 XP el primer share por `(usuario,fuente,item_id)` y 5 XP los posteriores**, con **tope de 10 eventos y 50 XP por ventana rodante de 24h** (los eventos sin remanente se registran con `xp_ganado=0`); el XP pasa por `xpConMultiplicador`/`aplicarAmuletoX2`/`aplicarFamaPandilla`/`repartirXpReferidos` y el ledger se actualiza con el XP final. **No escribe en `interacciones`** (CHECK intacto).
     - **3 misiones nuevas** (`mis_primer_compartido` 15 XP, `mis_voz_comunidad` 40 XP, `mis_embajador_destinos` 75 XP) y **3 logros nuevos** (`logr_primer_compartido` bronce, `logr_compartidor_25` plata, `logr_viral_100` oro); catalogo real HOY: **39 misiones y 33 logros**.
     - **Media unificada:** POST `media_voto` y `media_comentar`; GET `media_interacciones` y `media_comentarios`; alias legacy conservados (`album_voto`, `foto_voto`, `comentario_foto`, `comentario_voto`, `comentario_eliminar`, `guardar_media`, `comentarios_foto`).
     - **TODOS los lectores legacy migrados a `media_*`:** `album_detalle`, `fotos_top`, `mi_feed_fotos`, `multimedia_mapa`, `comentarios_recientes`, checks de misiones/logros, `museo_publico`, `arbol`, `mis_fotos` y sendero audiovisual. Helpers `conDegradacionMedia`/`contarComentarioSafe`/`contarCompartidosUsuario` degradan con `warn` si falta la tabla (patron BUG-051/BUG-060).
     - **`galeria_destino` items[] v2** con `fuente`, `votos`, `comentarios`, `ya_votado`, `ya_guardado` y `tipo_voto:'media'`; metricas en lote sin N+1.
  4. **`api/pagina-destino.js` (header v10, +40/-27).** Hero en mosaico (grid `1.9fr` + columna, fila 360px: 1 principal + 3 secundarias) y boton **Compartir** al final de la barra sticky `.subnav` (atributos `data-share*`; no aparece en blog), con carga de `/compartir.js` junto a `usuario-session.js`. La galeria principal llega a 12 miniaturas (comunidad max 6 + relleno con curadas).
  5. **Nuevo asset `compartir.js` (295 lineas).** `window.ExploraCompartir = { VERSION, init, compartir }`: Web Share API + WhatsApp + Copiar link, popover propio, POST `tipo=compartir` y toasts reusando `window.ExploraCO.mostrarToast`; la acreditacion local de XP/misiones/logros delega en `usuario-session.js`.
  6. **`galeria.html` (+222/-32).** Modo destino con 5 secciones ("Fotos de este lugar", "Albumes de este espacio", "Fotos de la comunidad", "Mapa y audiovisual", "Comparte tu foto") y modal de foto/album con VOTAR, GUARDAR, COMPARTIR y comentarios para las 3 fuentes; carga `/compartir.js`.
  7. **`album-comments.js` v2.0.0 (+92/-33).** Firma `mount(target, {fuente,itemId}, opts)` retrocompatible con la de string legacy (string -> `fuente='album_foto'`); GET `comentarios_foto` para album y `media_comentarios` para las otras fuentes.
  8. **`usuario-session.js` (+24/-0).** Helper `window.ExploraCO.aplicarResultadoXp(data)`: unico punto de acreditacion de acciones de XP de un caller externo (compartir.js), reusando `sumaMisionesXp`/`sumaLogrosXp`/`aplicarDesbloqueos` y los toasts existentes.
  9. **`index.html` (+50/-17) / `comunidad.html` (+1/-1) / `mi-perfil.html` (+1/-1).** `index.html`: insignia `compartido` reincorporada (derivada del catalogo real de logros via `_compartidosDeLogros` -> `_sharedCount`). Los 3 y `galeria.html` reciben cache-bust `album-comments.js?v=2`.

- **Archivos en el working tree (SIN commitear; `git diff --numstat`):**
  - `api/interacciones.js` (+949/-425; header v19).
  - `galeria.html` (+222/-32).
  - `album-comments.js` (+92/-33; v2.0.0).
  - `index.html` (+50/-17).
  - `api/pagina-destino.js` (+40/-27; header v10).
  - `usuario-session.js` (+24/-0).
  - `comunidad.html` (+1/-1) y `mi-perfil.html` (+1/-1): SOLO cache-bust.
  - NUEVOS sin versionar: `compartir.js` (295 lineas), `db/migrations/022_media_compartidos.sql` (131), `db/migrations/023_interacciones_media_unificadas.sql` (408), `scripts/smoke_036_compartir.js` (290) y `scripts/smoke_036_media_unificada.js` (361).

- **Presupuesto de endpoints:** **8/8 INTACTO** (ADR-001). Cero archivos nuevos en `api/`; `compartir` y toda la media entran como ramas `?tipo=` de `api/interacciones.js`.

- **Evidencia (ADR-006, verificada en esta sesion documental el 2026-09-17):**
  - Existen los 5 archivos nuevos (untracked) y sus line counts coinciden (295/131/408/290/361).
  - Headers reales: `api/interacciones.js` v19, `api/pagina-destino.js` v10.
  - Anclas reales: `api/interacciones.js` L1421/L1429/L1439 (3 misiones), L1774/L1782/L1790 (3 logros), L7070+ (rama `compartir`), L2610 (`INSERT media_votos`), L2800 (`INSERT media_comentarios`), L4584 (`media_interacciones`), L4618 (`media_comentarios`), L4143-4231 (`items[]` v2); `api/pagina-destino.js` L201-204 (CSS hero mosaico) y L2246-2253 (boton Compartir en `.subnav`); `compartir.js` L285-287 (`window.ExploraCompartir`); `album-comments.js` L610 (`version: '2.0.0'`); `index.html` L4208 (insignia `compartido`).
  - `node --check` **7/7 OK**: `api/interacciones.js`, `api/pagina-destino.js`, `compartir.js`, `album-comments.js`, `usuario-session.js` y los 2 smokes.
  - ASCII-safe verificado por buffer: 0 bytes >127 y 0 backticks en `api/interacciones.js`, `api/pagina-destino.js`, `compartir.js`, las 2 migraciones y los 2 smokes. `usuario-session.js` mantiene su baseline no-ASCII preexistente (2386 bytes >127) con delta 0 en lo nuevo.
  - Smokes re-ejecutados en esta sesion: `scripts/smoke_036_compartir.js` **55/55 PASS** y `scripts/smoke_036_media_unificada.js` **71/71 PASS**. **Ambos usan mock: NO validan el esquema de Neon.**

- **PENDIENTE OPERATIVO (bloqueante, lo ejecuta Javier; requiere Neon):**
  1. **Aplicar `db/migrations/022_media_compartidos.sql` y `db/migrations/023_interacciones_media_unificadas.sql` en Neon** (cada archivo COMPLETO en una corrida; idempotentes). Correr los preflights read-only de cada archivo (022: CHECK legacy sin `compartir`, indice parcial, prueba del `ON CONFLICT`; 023: 6.1-6.5) y, si el `ON CONFLICT` parcial falla por inferencia, aplicar el PLAN B de la 022.
  2. **Verificar** que `media_compartidos`, `media_votos`, `media_comentarios` y `media_comentario_likes` existen, que `media_guardados.item_id` es `text` y que su CHECK admite `'curada'`, y que los conteos unificados igualan o superan a los legacy (preflight 6.2).
  3. **Deploy del backend v19** solo despues de la 022/023; luego frontend (`compartir.js`, `galeria.html`, `album-comments.js`, `index.html`, `comunidad.html`, `mi-perfil.html`, `usuario-session.js`).
  4. **Verificacion en vivo:** compartir una foto curada (25 XP, ledger en `media_compartidos`), repetir (5 XP), votar/comentar/guardar una curada y una de viajero, y ver la insignia `compartido`.
  5. **Rollback (solo emergencia):** `DROP TABLE media_comentario_likes/media_comentarios/media_votos` y revertir `media_guardados.item_id` a uuid (LOSSY si hay item_id no-uuid); las tablas legacy NO se tocan. Scripts de bajada fuera del flujo normal.

- **Hallazgos / pendientes derivados:**
  - **Deuda de esquema base no versionado:** CHECK de `interacciones.tipo` y tablas `usuarios`/`interacciones`/`destinos_fotos` fuera de `db/migrations/` (patron BUG-021); tipo real de `destinos_fotos.id` por verificar (preflight 6.1); tablas legacy `album_votos`/`album_comentarios`/`album_comentario_votos` retiradas del backend pero no dropeadas. Registrado en BUGS_HISTORICOS.md, seccion "Deuda ADR-036".
  - **Nota ADR-006 (discrepancia con el reporte de sesion):** la insignia `compartido` volvio SOLO en `index.html`; `comunidad.html` y `mi-perfil.html` solo recibieron el cache-bust `?v=2` (su comentario de `XP_BADGES` aun lista `compartido` como removido). Consistencia de UI pendiente, no bloqueante.
  - **BUG-061 sigue ABIERTO:** `POST tipo='foto'` sin `validarSesion` (escalado a `sql-security`); la rama nueva `compartir` no lo repite.

- **Fuera de alcance:** DROP de tablas legacy; versar el esquema base; arreglar BUG-061/BUG-062; pen-test en vivo; indices de apoyo adicionales.

---

### TSK-111: Geocerca con radio urbano de 50 m, `album_oficial` en el mapa cultural, limpieza de modulos del admin y refactor de hero/galeria de la ficha de destino [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-17, implementada en working tree, SIN commitear). **PENDIENTE OPERATIVO (BLOQUEANTE): aplicar las migraciones pendientes 019, 020, 021, 022 y 023 en Neon (las aplica Javier; cada archivo COMPLETO en una corrida) ANTES del deploy; despues, commit/push/deploy de los 7 archivos modificados + este cierre documental en un solo release. TSK-111 NO genera migraciones.** **Nota de actualizacion (2026-09-17, ADR-006): Javier confirmo que las migraciones 019, 020, 021, 022 y 023 YA FUERON APLICADAS en Neon; queda vigente el commit/push/deploy de los 7 archivos. La migracion 024 pertenece a TSK-112 y aun no existe en el working tree.** **Nota de correccion (2026-09-18, ADR-006): la 024 YA EXISTE en el working tree (TSK-112, 232 lineas); ver la entrada TSK-112.**
- **Prioridad:** Alta
- **Fecha:** 2026-09-17
- **ADR:** DECISIONS.md ADR-037 (NUEVO, consolidado de TSK-111) + NOTA DE ENMIENDA fechada en ADR-024 (radios urbanos) y ADR-034 (hero/galeria/orden de modulos); las decisiones no se duplican aqui.
- **Responsable:** build (implementacion) + admin-dev/renderer-dev/backend-dev/js-silo-dev (ejecucion delegada) + docs-keeper (cierre documental).
- **Precedencia:** continua a TSK-110 / ADR-036; `api/interacciones.js` pasa de v19 a v20 (header real L1-2) y `api/pagina-destino.js` pasa de v10 a v11 (header real L1-10, con el changelog de TSK-111).
- **Relacion con bugs:** NO cierra BUG-061 (`POST tipo='foto'` sin `validarSesion`; sigue ABIERTO y escalado a `sql-security`) ni BUG-062 (fotos Unsplash en `admin.html`). No abre bug nuevo: la deuda ASCII detectada es PREEXISTENTE (`BUG-002` en `api/pagina-destino.js:2431` y H8 en `api/utilidades.js`), no introducida por TSK-111.

- **Alcance ejecutado (verificado contra archivo real, ADR-006; `git diff --numstat` = 7 archivos modificados, +335/-298, mas 1 archivo nuevo sin versionar; TSK-111 NO genera migraciones):**

  1. **CAMBIO 4 - radio de geocerca urbano 100 m -> 50 m.** `RADIO_DEFAULT_M` 100->50 (`api/interacciones.js` L139) y `RADIO_POR_CATEGORIA` `sitio/hostal/comida` 100->50 (L140; `evento` 150 intacto); las subcategorias URBANAS bajan a 50 (`espacio-publico`, `sitio-historico`, `museo`, `cultura`, `religioso`, `bar`, `restaurante`, `cafe`, `gastrobar`, `comida-rapida`, `dulces`, `teatro`, `exposicion`, `cine`, `fiesta`); rural 250, parque 150, concierto 150, festival 200 y deporte 200 INTACTOS. `ACCURACY_MAX_M=150` (L151) y su bloqueo 422 `PRECISION_INSUFICIENTE` SIN cambios (el accuracy es un chequeo de precision GPS, independiente del radio del lugar).
  2. **CAMBIO 8 - `album_oficial` en `multimedia_mapa`.** La rama GET `?tipo=multimedia_mapa` acepta `?destino_id=<uuid>` validado con la MISMA regex uuid inline de `usuario_id` (ausente o invalido = se ignora, sin 400); query INDEPENDIENTE del UNION ALL a `destinos_fotos` (`SELECT id,url,caption,orden ... WHERE destino_id=$1::uuid ORDER BY es_hero DESC NULLS LAST, orden ASC NULLS LAST LIMIT 12`) envuelta en `conDegradacionMedia` (42P01/42703 -> `[]`); la respuesta agrega la clave aditiva `album_oficial` (`api/interacciones.js` L4324-4330 y L4449-4460). Cliente: `cargarAlbumOficialDestino`/`window.cargarAlbumOficialDestino` (`index-api-connector.js` L391/L412) y `mdMapaAlbumOficial` (`index.html` L3327, solo rama `origen='destino'` L3382).
  3. **CAMBIO 2 - guard de `edad_minima`.** El chip de edad minima solo se pinta si `String(...).trim() !== ''` (`api/pagina-destino.js` L1690); el campo sigue existiendo y siendo editable en el admin.
  4. **CAMBIO 3A - "Que incluye el precio" eliminado** de la UI del admin y del render publico. NO se toco la mision `mis_nomada_digital` ni los seeds: el legacy convive.
  5. **CAMBIO 3B - UI "Orden de los modulos" eliminada.** El elemento `#hostal-modulos-list` queda OCULTO (`style="display:none" aria-hidden="true"`, `admin.html` L1234) para PRESERVAR el orden guardado (no se pierde el dato); `tags.orden_modulos` y la logica de ensamblado siguen vivos.
  6. **CAMBIO 3C - seccion "Operacion" eliminada;** `f-capacidad` reubicado en la pestana General (`#fpanel-general`, `admin.html` L813-818); `f-comotransporte` (codigo muerto) eliminado end-to-end.
  7. **CAMBIO 1 - reordenamiento en el admin.** Actividades ya tenian Subir/Bajar; se anadieron a FAQ (`moveFaqRow` L3253 sobre el generico `moverFila` L3234).
  8. **CAMBIO 5/6/7A/7B - hero y galeria de la ficha.** Hero botonera en 2 filas (`.hctar-row`, `api/pagina-destino.js` L189/L2342-2343); grid hero 1+3; imagenes del hero clickeables al lightbox existente (`abrirLightboxHero` L2577) con votos/comentarios placeholder/2 CTAs a galeria; eliminado "Fotos de viajeros" (`loadFotos`/`subirFoto`/`votarFoto` + CSS `fp-*`; L2079/L2600) y CTA renombrado a "Ver todas las fotos" (L1571-1572).

- **Archivos en el working tree (SIN commitear; `git diff --numstat`):**
  - `admin.html` (+49/-82): modulos retirados de la UI, `#hostal-modulos-list` oculto, `f-capacidad` en General, `moverFila`/`moveFaqRow`.
  - `api/interacciones.js` (+44/-8; header v20): radio urbano 50 m + `album_oficial`.
  - `api/pagina-destino.js` (+121/-194; header v11): guard `edad_minima`, hero 2 filas 1+3 + lightbox, modulos retirados, CTA "Ver todas las fotos".
  - `index-api-connector.js` (+32/-0): `cargarAlbumOficialDestino`/`window.cargarAlbumOficialDestino`.
  - `index.html` (+51/-1): `mdMapaAlbumOficial` (solo rama `origen='destino'`).
  - `scripts/smoke_016_multinivel_crowdsourcing.js` (+29/-3): smoke actualizado por el cambio de radio / conteos.
  - `scripts/smoke_auditoria_pagina_destino.js` (+9/-10): smoke actualizado por el retiro de modulos de la ficha.
  - NUEVO sin versionar: `PROMPT_OPENCODE_TSK111.md` (449 lineas, prompt de la tarea; no es artefacto de producto).
  - **Sin migraciones nuevas** (TSK-111 no genera SQL; las 019-023 pendientes son de TSK-107..110).

- **Presupuesto de endpoints:** **8/8 INTACTO** (ADR-001 / ADR-010). Cero archivos nuevos en `api/`; `album_oficial` entra como clave aditiva de la rama `?tipo=multimedia_mapa`.

- **Evidencia (ADR-006, verificada en esta sesion documental el 2026-09-17):**
  - Headers reales: `api/interacciones.js` v20 (`// api/interacciones.js  v20 ...` L1 y `TSK-111 (v20)` L2); `api/pagina-destino.js` v11 con changelog TSK-111 L1-10.
  - Anclas reales: `api/interacciones.js` L139 (`RADIO_DEFAULT_M = 50`), L140 (`RADIO_POR_CATEGORIA = { sitio: 50, hostal: 50, comida: 50, evento: 150 }`), L141-147 (`RADIO_POR_SUBCATEGORIA`), L151 (`ACCURACY_MAX_M = 150`), L4324-4330 (regex uuid de `destino_id`), L4449-4460 (`album_oficial`); `api/pagina-destino.js` L189 (`.hctar-row`), L820/L2577 (`abrirLightboxHero`), L1571-1572 (CTA "Ver todas las fotos"), L1690 (guard), L2079/L2600 ("Fotos de viajeros" retirado); `admin.html` L816 (`f-capacidad`), L1234 (`#hostal-modulos-list` oculto), L3234/L3253 (`moverFila`/`moveFaqRow`); `index-api-connector.js` L391/L412; `index.html` L3327/L3382.
  - **Escudo GOLD (qa-auditor): APTO CON OBSERVACIONES.** `node --check` 8/8 en `api/*.js`; `api/interacciones.js` ASCII 0/0/0 (bytes >127, backticks, doble-escape); balance de DIVs de `admin.html` (hostal/comida/sitio/evento) = 0; smokes `check_buildHTML_inline`, `smoke_auditoria_pagina_destino` (54), `smoke_016` (52) y `smoke_021` (45) PASS.
  - `smoke_test_epic_prompt` mantiene **4 FAIL PREEXISTENTES** ajenos a esta entrega (deuda DQ-2 registrada en `BUGS_HISTORICOS.md:1115-1118`).
  - **Deuda ASCII preexistente (NO introducida por TSK-111):** `api/pagina-destino.js:2431` (1 doble-escape, BUG-002) y `api/utilidades.js` (H8).

- **PENDIENTE OPERATIVO (bloqueante, lo ejecuta Javier; requiere Neon):**
  1. **[RESUELTO - 2026-09-17] Aplicar en Neon las migraciones pendientes 019, 020, 021, 022 y 023** (cada archivo COMPLETO en una corrida; idempotentes ADR-008, patron BUG-021/BUG-060) -- **Javier confirmo (2026-09-17) que las 019-023 YA ESTAN APLICADAS en Neon; la unica migracion pendiente de aplicar es la 024 (TSK-112), ya creada (232 lineas; ver TSK-112)**: `db/migrations/019_media_guardados_radio.sql` (TSK-107), `020_destinos_sintro.sql` (TSK-108), `021_xp_decimal.sql` (TSK-109), `022_media_compartidos.sql` y `023_interacciones_media_unificadas.sql` (TSK-110). **TSK-111 NO agrega migraciones.**
  2. **Commit + push + deploy en un solo release** de los 7 archivos modificados (`admin.html`, `api/interacciones.js`, `api/pagina-destino.js`, `index-api-connector.js`, `index.html`, `scripts/smoke_016_multinivel_crowdsourcing.js`, `scripts/smoke_auditoria_pagina_destino.js`) + los pendientes de TSK-107..TSK-110 sin commitear + este cierre documental. NO mezclar los 3 archivos borrados ajenos (`PROMPT.md`, `prompt_exploraco_tsk104.md`, `promptarreglos.txt`).
  3. **Verificacion en vivo:** "Estuve aqui" a <= 50 m en un destino urbano y rechazo 422 fuera del radio/accuracy; `album_oficial` visible en el drawer del pin del mapa; chip de `edad_minima` ausente cuando el campo esta vacio; hero con botonera en 2 filas, grid 1+3 y lightbox; ausencia de "Que incluye el precio", de la UI "Orden de modulos" y de "Operacion" en Contacto; FAQ reordenable con Subir/Bajar.

- **Hallazgos / pendientes derivados:**
  - **`#hostal-modulos-list` se conserva OCULTO a proposito:** el control visual se retiro (CAMBIO 3B) pero el nodo queda en el DOM con `display:none` para no perder `tags.orden_modulos` guardado; la logica de lectura/ensamblado sigue activa.
  - **Drift del prompt vs implementacion (ADR-006):** `PROMPT_OPENCODE_TSK111.md` especificaba radio 30 m; la implementacion real uso 50 m. El prompt (untracked) se alineo a 50 m en este cierre documental.
  - **`f-comotransporte` era codigo muerto:** se elimino end-to-end sin contraparte en backend.
  - **BUG-061 ABIERTO:** `POST tipo='foto'` sin `validarSesion` (escalado a `sql-security`); **BUG-062 ABIERTO:** fotos Unsplash no recolectadas por `getPhotos()` en `admin.html`.
  - **Deuda ASCII preexistente:** el doble-escape de `api/pagina-destino.js:2431` (BUG-002) y el baseline no-ASCII de `api/utilidades.js` (H8) siguen ahi; no son de TSK-111.

- **Fuera de alcance:** migraciones SQL (TSK-111 no genera ninguna); BUG-061 y BUG-062; `galeria.html`, `compartir.js` y `album-comments.js` (pertenecen a TSK-110); `api/usuarios.js`, `api/admin.js`, `api/utilidades.js`, `api/destinos.js` y `api/publicar-lugar.js`; verificacion en vivo (post-deploy).

---

### TSK-112: Sistema de Casas (cofre + nivelacion) y Clases Rising Star [IMPLEMENTADO EN WORKING TREE]

- **Estado:** **IMPLEMENTADO EN WORKING TREE** (2026-09-18, SIN commitear). Los entregables listados abajo estan verificados contra el archivo real (ADR-006): la migracion 024 EXISTE, el backend v16/v21 esta implementado y el frontend esta montado. **PENDIENTE OPERATIVO (BLOQUEANTE): aplicar `db/migrations/024_casas_cofre_y_clases.sql` en Neon (UNICA migracion pendiente de aplicar; 019-023 YA aplicadas, confirmado por Javier el 2026-09-17) ANTES del deploy; despues, commit/push/deploy del backend v16/v21 + frontend y verificacion en vivo.** **Nota de actualizacion (2026-09-18, ADR-006):** el snapshot del 2026-09-17 registraba "la migracion 024 AUN NO existe en el working tree" y "aun NO hay codigo, migracion ni QA ejecutados"; ese estado quedo SUPERSEDIDO por la implementacion real del working tree que se documenta abajo y se conserva como registro historico (Regla de Oro 3). Nota de convencion: la leyenda de este tablero usa "EN PROGRESO"; esta entrada uso "EN CURSO" durante su ejecucion.
- **Prioridad:** Alta
- **Fecha:** 2026-09-17
- **ADR:** DECISIONS.md **ADR-038** (verificado contra archivo real, ADR-006: existe en L1460+ y su **ENMIENDA 1 (2026-09-18) en L1639-1677**). Su Estado declarado es "Aprobado e IMPLEMENTADO con Enmienda 1 (2026-09-18)": la ENMIENDA 1 formaliza y aprueba el contrato REALMENTE implementado en TSK-112 (helpers `contextoXpE`/`calcularXpFinal`/`calcularNivelClase`/`acreditarClaseYCofre`, sin `entregarXpUsuario`, sin afinidad por accion, sin gate de nivel, `xp_clase` = 50% del `xp_final`, cofre real en `casas_cofre`). **La decision NO se duplica aqui:** tablas, catalogos, formulas y tabla de factores viven en el ADR.
- **Responsable / agentes:** architect + architect-review (contrato de diseno y aprobacion del ADR); sql-security (migracion 024 y cofre); backend-dev x2 (`api/usuarios.js`, `api/interacciones.js`); frontend-tpl (UI de Casas/Clases); qa-auditor (Escudo GOLD); docs-keeper (esta entrada documental).
- **Precedencia:** continua a TSK-111 / ADR-037 y REUTILIZA el modelo de Casas de ADR-028 (migracion 017). Versionado ejecutado (verificado, ADR-006): `api/usuarios.js` v15 -> **v16** y `api/interacciones.js` v20 -> **v21** (headers reales HOY v16 y v21).
- **Migracion:** `db/migrations/024_casas_cofre_y_clases.sql` (NUEVA, numeracion consecutiva tras la 023; **232 lineas**, idempotente ADR-008, ASCII-safe ADR-002, `node`/SQL OK). **`casas_votaciones` se DIFIERE a v2** (NO entra en la 024); **NO se crea `casa_id`** (se reusa `usuarios.casa`) y **NO hay FK** en v1.
- **Relacion con bugs:** sin bugs asociados al arranque de TSK-112. BUG-061 (`POST tipo='foto'` sin `validarSesion`, escalado a `sql-security`) y BUG-062 (fotos Unsplash en `admin.html`) siguen **ABIERTOS** y son ajenos a esta tarea.

- **Alcance ejecutado (contraste contra archivo real, ADR-006, verificado el 2026-09-18):**

  1. **Se REUSA `usuarios.casa` (RECHAZO explicito de la propuesta original, MANTENIDO).** La migracion 024 NO crea `casa_id` ni `casas_tributacion`; un solo modelo de identidad de Casa (anti-duplicidad, AGENTS.md seccion 2.1). Se conservan `usuarios.casa` (`condor|jaguar|delfin`, CHECK `chk_usuarios_casa`, indice parcial `idx_usuarios_casa`) de la migracion 017 / ADR-028.
  2. **Tabla `casas_cofre` (cofre + nivelacion), realmente creada.** `casa varchar(20) PRIMARY KEY` + CHECK `chk_casas_cofre_casa` (`condor|jaguar|delfin`), `xp_cofre_total numeric(12,2)`, `poblacion_activa int`, `factor_conversion numeric(5,4)`, `actualizado_en timestamptz`; seed idempotente `INSERT ... ON CONFLICT (casa) DO NOTHING` de las 3 Casas; **SIN FK** `usuarios.casa -> casas_cofre.casa` en v1. `poblacion_activa`/`factor_conversion` son cache NO autoritativa (la fuente de verdad es el calculo runtime). La **tributacion del 10% del XP** se acredita best-effort al cofre con el literal `0.10` dentro de `acreditarClaseYCofre`; **NO existe endpoint HTTP `casa_tributar`** (presupuesto 8/8 INTACTO, ADR-001/ADR-010).
  3. **Clases Rising Star realmente implementadas.** `usuarios` gana `clase_id varchar(20)` (CHECK `chk_usuarios_clase`: `cartografo|cronista|explorador`), `nivel_clase int NOT NULL DEFAULT 1`, `xp_clase numeric(12,2) NOT NULL DEFAULT 0` y `clase_elegida_en timestamptz`; **coexisten** con el Arbol de Clases de 16 ramas (`usuarios.progreso_arbol`, ADR-028). Constantes reales en `api/interacciones.js`: `BONUS_CLASE = { cartografo: 0.08, cronista: 0.10, explorador: 0.07 }` y `XP_NIVEL_CLASE = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 5700, 7500]` (11 umbrales); `xp_clase` incrementa el **50% del `xp_final`** (post factor de Casa). Rama POST `clase_elegir` en `api/usuarios.js` v16: sin gate de nivel; primera eleccion gratis (`WHERE clase_id IS NULL`); recambio con pago de **300 XP** + **cooldown de 30 dias** via `clase_elegida_en`; errores `CLASE_INVALIDA`, `CLASE_YA_ELEGIDA`, `COOLDOWN_CLASE`, `PUNTOS_INSUFICIENTES`, `EMAIL_SIN_VERIFICAR` (ver ENMIENDA 1 del ADR-038).
  4. **Helper unico de entrega de XP y tributacion (anti-duplicidad).** La triada real en `api/interacciones.js` v21 es `contextoXpE` / `calcularXpFinal` / `calcularNivelClase` / `acreditarClaseYCofre` (NO existe el monotilitico `entregarXpUsuario` que proponia el diseno). Se aplica a las **14 acciones de la whitelist**: `resena`, `foto`, `visita`, `guardado`, `rating`, `compartir`, `media_voto`, `media_comentar`, `chat_msg`, `plan_chat_msg`, `album_crear`, `album_agregar_foto`, `activo_oculto_checkin` y `activo_oculto_votar`; **EXCLUIDOS** cobros (`dm_enviar`, `comprar_consumible`) y bonos/terceros (`evaluarMisiones`, `evaluarLogros`, `progresarPandillaRetos`, `repartirXpReferidos`). Los `UPDATE usuarios SET xp_total` se conservan inline para preservar los contadores en el mismo UPDATE.
  5. **Factor de nivelacion por poblacion activa (runtime).** `calcularTagCasa` usa la poblacion relativa de la Casa: `pct > 0.45` -> `dominante` (x0.85), `0.25 <= pct <= 0.45` -> `equilibrada` (x1.00), `pct < 0.25` -> `rezagada` (x1.30); se aplica UNA sola vez en `calcularXpFinal`. `arancel_inter_casa` y `fee_mercado_interno` se exponen pero **NO se cobran en v1**.
  6. **Persistencia ejecutada:** migracion unica `db/migrations/024_casas_cofre_y_clases.sql` (ALTER de `usuarios` con 4 columnas + CHECK `chk_usuarios_clase` + `CREATE TABLE casas_cofre` + seed + indice parcial `idx_usuarios_clase_id`), idempotente (ADR-008) y ASCII-safe (ADR-002).
  7. **Versionado ejecutado:** `api/usuarios.js` **v16** y `api/interacciones.js` **v21** (`node --check` OK; ASCII 0/0/0).
  8. **Verificacion ejecutada (Escudo GOLD + smoke):** ver el bloque "Escudo GOLD" mas abajo; el smoke dedicado `scripts/smoke_038_casas_clases.js` corre con mock y pasa **76/76**.

- **Estado real del working tree (verificado con `git`, `db/migrations/` y headers el 2026-09-18, ADR-006):**
  - `db/migrations/024_casas_cofre_y_clases.sql`: **EXISTE** (232 lineas, idempotente, ASCII-safe; 0 bytes >127 y 0 backticks).
  - `api/usuarios.js`: header real **v16** (`v16 (TSK-112 / ADR-038: casas_cofre + factor de nivelacion; clase_elegir y clases Rising Star)`). `api/interacciones.js`: header real **v21** (`v21 (TSK-112 / ADR-038: calcularXpFinal clase+Casa, tributacion al cofre, xp_clase/nivel_clase)`).
  - `git status` (2026-09-18): ademas de los cambios ajenos de TSK-111/`build.md`/`agents.md`, TSK-112 agrega `M api/usuarios.js`, `M api/interacciones.js`, `M mi-perfil.html`, `M comunidad.html`, `M exploraco desarrollo/DECISIONS.md` (ADR-038 + ENMIENDA 1), `M TASKS.md`, `M NEXT.md`, y sin versionar `?? db/migrations/024_casas_cofre_y_clases.sql`, `?? scripts/smoke_038_casas_clases.js` y `?? PROMPT_OPENCODE_TSK112.md` (prompt de la tarea, no es artefacto de producto).
  - **La implementacion, la migracion y el QA de TSK-112 YA estan ejecutados** (ver entregables y Escudo GOLD abajo).

- **Entregables reales en el working tree (SIN commitear):**
  1. `db/migrations/024_casas_cofre_y_clases.sql` (232 lineas, idempotente ADR-008, ASCII-safe ADR-002): 4 columnas en `usuarios` (`clase_id`, `nivel_clase`, `xp_clase`, `clase_elegida_en`) + constraint `chk_usuarios_clase` + tabla `casas_cofre` (PK casa + `xp_cofre_total`/`poblacion_activa`/`factor_conversion`/`actualizado_en`) con seed idempotente de las 3 Casas + indice parcial `idx_usuarios_clase_id`. NO crea `casa_id`, NO `casas_votaciones`, NO FK.
  2. `api/usuarios.js` v16 (`node --check` OK; ASCII 0/0/0): `casa_ranking` extendido (conserva el shape `{ok:true,data:{casas,top}}` y las llaves previas; agrega `xp_cofre_total`/`factor_conversion`/`pct`/`tag`/`multiplicador_xp`/`arancel_inter_casa`/`fee_mercado_interno`, con degradacion 42P01/42703 + `console.warn`); nueva rama POST `clase_elegir`; `casa_elegir` conserva su contrato y refresca `poblacion_activa` best-effort.
  3. `api/interacciones.js` v21 (`node --check` OK; ASCII 0/0/0): helpers unicos `BONUS_CLASE`, `XP_NIVEL_CLASE`, `calcularNivelClase`, `calcularXpFinal`, `calcularTagCasa`, `contextoXpE` y `acreditarClaseYCofre`; aplicados a las 14 acciones de la whitelist (excluidos cobros y bonos a terceros); tributacion 10% al cofre best-effort; sin endpoint `casa_tributar`.
  4. `mi-perfil.html`: nueva seccion "Mi Clase" (`#pf-clase`, L733) + modal (`#modal-clase`, L734) + JS `cargarClase` (L3774)/`elegirClase` (L3836); `#pf-casa` (L729) enriquecido con tag/multiplicador/cofre. Balance de divs **390/390 = 0**.
  5. `comunidad.html`: cards del ranking de Casas con tag/multiplicador/cofre (L1613-1614). Balance de divs **304/304 = 0**.
  6. `scripts/smoke_038_casas_clases.js` (NUEVO, ASCII-safe): **76/76 PASS** (mock, no valida Neon).
  7. Documentacion: ADR-038 + **ENMIENDA 1** ya emitida en `DECISIONS.md` (L1639-1677) por el architect; el frontend usa catalogos locales espejo `CLASES_META`/`XP_NIVEL_CLASE` (el campo `clases` en `arbol_catalogo` queda DIFERIDO a v2).

- **Escudo GOLD (resultado real, 2026-09-18):**
  - `node --check` OK en `api/usuarios.js` y `api/interacciones.js`; ASCII-safe **0 bytes >127 y 0 backticks** en ambos API, en la migracion 024 y en `smoke_038`.
  - Balance de divs **0** (`mi-perfil.html` 390/390, `comunidad.html` 304/304).
  - Smokes PASS: `smoke_017_perfil_arbol_casas` 73/73, `smoke_021_xp_decimal` 45/45, `smoke_036_media_unificada` 85/85, `gamificacion_v4` 95/95 y `smoke_038_casas_clases` 76/76.
  - El QA inicial reporto "GOLD FAIL" SOLO por desincronizacion entre el diseno del ADR-038 y el codigo real; el architect emitio la **ENMIENDA 1** que formaliza el contrato implementado y los checks mecanicos pasaron (no hubo fallo de sintaxis, ASCII ni balance).

- **Deuda PREEXISTENTE (NO introducida por TSK-112):** los `.catch(function(){})` best-effort de `api/interacciones.js` (37 ocurrencias, muchas sobre escrituras no criticas de XP/coleccionables; patrocinadas por el patron BUG-021). TSK-112 no creo ese patron: solo toco algunas lineas que ya lo tenian (los `UPDATE usuarios SET xp_total` re-escritos). No bloquean el cierre de TSK-112; quedan marcados para una tarea de limpieza (AGENTS.md seccion 2.2 prohibe capturar y silenciar sin log).

- **PENDIENTE OPERATIVO de TSK-112 (lo ejecuta Javier; requiere Neon):**
  1. **Migraciones 019, 020, 021, 022 y 023: YA APLICADAS en Neon (confirmado por Javier, 2026-09-17).** Dejan de ser bloqueo del release; su registro historico como pendientes (TSK-107..TSK-111) se conserva (Regla de Oro 3). **La 024 esta CREADA y es la UNICA migracion pendiente de aplicar en Neon.**
  2. **Aplicar `db/migrations/024_casas_cofre_y_clases.sql` en Neon** (archivo COMPLETO en una corrida; idempotente). Correr despues el preflight del ADR contra `information_schema` (columnas `clase_id`/`nivel_clase`/`xp_clase`/`clase_elegida_en`, tabla `casas_cofre` e igualdad de las listas CHECK `usuarios.casa` vs `casas_cofre.casa`).
  3. **Deploy del backend** (`api/usuarios.js` v16, `api/interacciones.js` v21) despues de la 024.
  4. **Deploy del frontend** de Casas/Clases (`mi-perfil.html`, `comunidad.html`).
  5. **Verificacion en vivo:** elegir Clase y ver el multiplicador/`tag` de Casa en el ranking; confirmar el tributo del 10% en `casas_cofre.xp_cofre_total`; probar recambio de Clase (300 XP + cooldown 30 dias).
  6. **Commit + push en un solo release** con los pendientes de TSK-107..TSK-111 y este cierre documental.

- **Ambiguedades (estado real tras la ENMIENDA 1 del ADR-038, 2026-09-18):** las ambiguedades 2 (gate de nivel >= 2) y 3 (mapeo de afinidad de las 14 acciones) quedaron **RESUELTAS por el contrato implementado: NO hay gate de nivel y NO existe afinidad de clase** (el bono de Clase se aplica a todas las acciones de la whitelist). La ambiguedad 4 queda ajustada a la curva real `XP_NIVEL_CLASE` de 11 umbrales (`[0,100,250,500,900,1400,2100,3000,4200,5700,7500]`) y `xp_clase = 50% del xp_final`. Sigue vigente la recomendacion (ambiguedad 6) de **revisar los umbrales de tag 45%/25% y los multiplicadores 0.85/1.00/1.30 tras la primera semana de datos**. Detalle en ADR-038, ENMIENDA 1 (DECISIONS.md L1639-1677).

- **Fuera de alcance:** `casas_votaciones` (DIFERIDA a v2); `casa_id` y `casas_tributacion` de la propuesta original (RECHAZADAS); cobro de `arancel_inter_casa`/`fee_mercado_interno` (v1 solo los expone); FK `usuarios.casa -> casas_cofre.casa` (v1 sin FK); archivo nuevo en `api/` (presupuesto 8/8 fijo, ADR-001); BUG-061 y BUG-062; verificacion en vivo (post-deploy).

---

### TSK-113: Sprint Multimedia / Perfil / Galeria / Mapa [COMPLETADA]

- **Estado:** **COMPLETADA** (2026-09-18, implementada en working tree, SIN commitear). Cierra el ciclo documental del Sprint Multimedia (referencia al prompt `PROMPT_OPENCODE_MULTIMEDIA_PERFIL_GALERIA.md`, untracked). **BUG-057 CERRADO** con el fix reforzado `v12.20260917` de `api/pagina-destino.js`. **PENDIENTE OPERATIVO (BLOQUEANTE): commit/push/deploy de los 4 archivos del sprint + este cierre documental en un solo release; NO mezclar los archivos ajenos del working tree (ver nota O3).** No genera migraciones ni archivos nuevos en `api/` (presupuesto 8/8 INTACTO, ADR-001/ADR-010).
- **Prioridad:** Alta
- **Fecha:** 2026-09-18
- **ADR:** no requiere ADR nuevo (extiende las UI y defensas de ADR-030/ADR-034/ADR-035/ADR-036 sin cambio de contrato); la desviacion de alcance O2 se documenta en esta entrada.
- **Responsable:** free-build + renderer-dev-free/frontend-tpl-free/js-silo-dev-free (implementacion en el sprint) + qa-auditor (Escudo GOLD #92) + docs-keeper-free (este cierre documental).
- **Precedencia:** continua a TSK-112 / ADR-038. `api/pagina-destino.js` pasa a **v12.20260917** (header real L1-2: changelog del fix de BUG-057 y defensas en listener capture).
- **Relacion con bugs:** BUG-057 **CERRADO** (fix reforzado, ver BUGS_HISTORICOS.md). BUG-002 (doble escape) **CONFIRMADO ABIERTO** en `api/pagina-destino.js` L2431 (1 ocurrencia real verificada ADR-006 el 2026-09-18, identica a HEAD; deuda preexistente, NO introducida por este sprint). BUG-061 y BUG-062 siguen **ABIERTOS** y son ajenos.

- **Alcance ejecutado (verificado contra archivo real con anclas ADR-006 el 2026-09-18):**
  1. **`api/pagina-destino.js` v12.20260917 -- fix reforzado de BUG-057 (CERRADO).** `cerrarPopoverGuardar` no cierra ante `ev.target.id==='btn-guardar'` (L2513); checkboxes Tu Mapa (L2533) y mapas tematicos (L2545) y boton "Nuevo mapa" (L2556) usan `event.stopPropagation()`; listener en fase de captura. `node --check` PASS; ASCII 0 bytes >127 / 0 backticks; `smoke_auditoria_pagina_destino` 54/54 PASS.
  2. **`mi-perfil.html` -- Grupo 1 (perfil multimedia); divs 394/394, script tags 3/3.** 1-A fotos propias con `mediaCardHTML` (L1832, unifica `foto_url||texto||media_url`, grid de 140px, votos, empty state "Aun no tienes fotos..." L1876). 1-B guardados ramificados por fuente (`album`/`album_foto`/`viajero_foto` con placeholder + enlace al destino e iconos por `media_type`). 1-C geolocalizacion en `agregarFotoAlbum` (`#album-nueva-foto-lat/lng` L658-660, boton `usarMiUbicacionAlbum` L660/L1992, validacion de rango Colombia, `body.lat/lng` solo si validos). 1-D logros (`renderTrofeoCard` L1140, desbloqueados primero, boton colapsable "+N bloqueados" L1155-1192 via `toggleTrofeosBloqueados`).
  3. **`galeria.html` -- paginacion 12/pagina; divs 84/84.** `G.galPagina/galPorPagina/galItems` (L248), consolidacion curadas -> viajeros -> albumes, `gGalRenderPage` (L882) y `gGalLoadMore` (L897); el boton `#g-more` se **REUTILIZA** en modo destino (no se crea `btn-gal-mas`).
  4. **`index.html` -- Grupo 3 + 4; divs 523/523.** 3-A header del drawer del mapa `#md-mapa-destino-titulo` (L1245) + `mdSetDestinoTitulo` (L3301-3302), invocado en pin de destino (L3310) y album del destino (L3454). 3-B `votarMediaMapa` (L3566) con manejo de sesion (muestra `mostrarLogin` L3569 y trata el 401 L3584). 4-A `renderLogrosGrid` (L4630) solo con `estado==='completada'` (L4648) y `tierOrder` platino>oro>plata>bronce (L4645), sin candados.

- **Desviacion de alcance O2 (documentada):** el spec 3-A del prompt apuntaba a `index-api-connector.js`; se resolvio **SIN modificar ese archivo** (verificado por `git status`: NO figura como modificado). Justificacion: el endpoint `multimedia_mapa` de `api/interacciones.js` filtra solo por `destino_id` (regex uuid inline; nunca lee el slug) y `cargarAlbumOficialDestino` ya envia `destino_id`; el componente visible (titulo del drawer) se resolvio en `index.html`. El backend no requirio cambios.

- **Archivos en el working tree (SIN commitear; `git diff --numstat` verificado el 2026-09-18):**
  - `api/pagina-destino.js` (+6/-6; header **v12.20260917** con changelog L1-2).
  - `galeria.html` (+58/-10; paginacion 12/pagina).
  - `index.html` (+103/-13; Grupo 3 + 4).
  - `mi-perfil.html` (+82/-27; Grupo 1 + comentario `Rev 2026-09-18b` insertado por O1 del Escudo GOLD #92).
  - Sin migraciones nuevas; sin archivos nuevos en `api/`.

- **Escudo GOLD #92 (qa-auditor): APROBADO CON OBSERVACIONES.** `node --check` PASS en `api/pagina-destino.js`; ASCII **0 bytes >127 y 0 backticks**; balance de divs **0/0/0** (mi-perfil 394/394, galeria 84/84, index 523/523; re-verificado en esta sesion documental); `smoke_auditoria_pagina_destino` 54/54 PASS; script tags balanceados (mi-perfil 3/3). Observaciones: **O1** (comentario `Rev 2026-09-18b` en `mi-perfil.html`) CERRADA en esta sesion; **O2** (desviacion 3-A connector) documentada arriba; **O3** (higiene de working tree) en pendientes.

- **PENDIENTE OPERATIVO (lo ejecuta Javier):**
  1. **Commit + push + deploy** de los 4 archivos del sprint + este cierre documental (`TASKS.md`, `NEXT.md`, `BUGS_HISTORICOS.md`, `docs/HANDOFF_037.md`) en un solo release.
  2. **NO mezclar archivos ajenos (O3):** `opencode.json` y `.opencode/agent/free-plan.md`/`media-reader-free.md`/`qa-auditor-free.md` modificados; 4 archivos borrados (`PROMPT_OPENCODE_TSK111.md`, `PROMPT_OPENCODE_TSK112.md`, `PROMPT_MULTIMEDIA_GALERIA.md`, `opencode - copia.json`); `PROMPT_OPENCODE_MULTIMEDIA_PERFIL_GALERIA.md` untracked (prompt de la tarea, no artefacto de producto).
  3. **Verificacion en vivo post-deploy:** drawer del mapa cultural con titulo del destino y voto de media en `index.html`; paginacion de `galeria.html`; fotos/guardados/geo/logros en `mi-perfil.html`; popover Guardar estable en la ficha.
  4. **Limpiar BUG-002** (doble escape) en `api/pagina-destino.js` L2431 (deuda preexistente, `'\\u2605'` en `addRvOptimista`).

- **Hallazgos / pendientes derivados:**
  - **BUG-002 confirmado ABIERTO** en `api/pagina-destino.js` L2431 (verificacion ADR-006: 1 doble-escape real, identico a HEAD).
  - **BUG-061** (POST `tipo='foto'` sin `validarSesion`, escalado a `sql-security`) y **BUG-062** (fotos Unsplash en `admin.html`) siguen **ABIERTOS**, ajenos.
  - El boton `#g-more` de `galeria.html` queda compartido por el feed y el modo destino (documentado para evitar regresiones).
  - `index-api-connector.js` no participo del sprint (O2); el wiring de `mdSetDestinoTitulo`/`votarMediaMapa` vive en `index.html`.

- **Fuera de alcance:** migraciones nuevas; archivos nuevos en `api/`; BUG-061/BUG-062; verificacion en vivo (post-deploy); refactor de `index-api-connector.js` (O2); limpieza de archivos ajenos del working tree (O3, decision de release de Javier).

---

### TSK-114: Museo multimedia URL-only, backend v22 y migracion 025 [IMPLEMENTADO EN WORKING TREE]

- **Estado:** **IMPLEMENTADO EN WORKING TREE** (2026-09-18, SIN commitear). Verificado contra archivo real (ADR-006): la migracion 025 EXISTE, la rama `?tipo=museo_recurso` y los filtros `af.visible` estan en `api/interacciones.js` v22. **PENDIENTE OPERATIVO (BLOQUEANTE): aplicar `db/migrations/025_album_fotos_visible.sql` en Neon ANTES del deploy del backend v22; el orden obligatorio del release es 024 -> 025 -> backend v22 (patron BUG-021/BUG-060).**
- **Prioridad:** Alta
- **Fecha:** 2026-09-18
- **ADR:** DECISIONS.md **ADR-039** (Museo URL-only) + **ENMIENDA 1 de ADR-039** (2026-09-18), que corrige la opcion 7 y la decision E del ADR para que el contrato vigente coincida con el codigo. La decision NO se duplica aqui.
- **Responsable / agentes:** architect + sql-security (migracion 025); backend-dev (rama `museo_recurso` y filtros); qa-auditor-free (Escudo GOLD); docs-keeper (esta entrada documental).
- **Precedencia:** continua a TSK-113. `api/interacciones.js` pasa de v21 a **v22** (release compartido con ADR-040 y T4.5; header real L1-17).
- **Relacion con bugs:** NO cierra BUG-061 (la rama legacy `POST tipo='foto'` sigue ABIERTA; la rama nueva SI exige `validarSesion` y toma el usuario de la sesion, cerrando esa clase de spoofing en el contrato nuevo). BUG-002 y BUG-062 siguen ABIERTOS, ajenos. No abre bug nuevo.

- **Alcance ejecutado (verificado contra archivo real, ADR-006, 2026-09-18):**

  1. **Migracion 025 - `db/migrations/025_album_fotos_visible.sql` (171 lineas, idempotente ADR-008, ASCII-safe ADR-002):** `ALTER TABLE album_fotos ADD COLUMN IF NOT EXISTS visible boolean NOT NULL DEFAULT false` (privado por defecto, decision b); backfill idempotente `UPDATE album_fotos SET visible=true WHERE activo=true AND visible=false` (el contenido legacy activo conserva su visibilidad publica pre-v22); indice unico parcial `idx_albumes_usuario_mi_museo ON albumes (usuario_id) WHERE titulo='Mi Museo' AND activo=true` (auto-album atomico). Incluye preflight/verificacion post-aplicacion y rollback documentado (LOSSY). NO crea `album_fotos.activo` (ya existe desde la 009).
  2. **Rama POST `?tipo=museo_recurso` (`api/interacciones.js` L6197-6415):** `accion=crear|editar|eliminar`. Auth SIEMPRE por sesion firmada (`verificarSesion`, ADR-025); el usuario sale del token, NUNCA del body. URL `^https?://` y longitud <= 2000; `tipo_media` en foto|video|audio; `caption` <= 200; `album_id` opcional propio (400 si ajeno); coords ambos o ninguno con rango [-90,90]/[-180,180] (`COORDENADAS_INVALIDAS`). Auto-album "Mi Museo" con `INSERT ... ON CONFLICT DO NOTHING` + re-SELECT. Coords se persisten en `albumes` destino (el recurso hereda la ubicacion de su carpeta).
  3. **Gate y XP (ENMIENDA 1 de ADR-039):** gate de creacion UNICO `mis_fotografo` para foto, video y audio (L6225-6227), porque `mis_videografo`/`mis_sonidista` cuentan recursos ya creados (deadlock circular); **+15 XP (`mrXp=15`, L6283) para los 3 tipos**, acreditado con `contextoXpE`/`calcularXpFinal`/`acreditarClaseYCofre`/`repartirXpReferidos` y seguido de `evaluarMisiones`/`evaluarLogros` (hitos POST-insert). NO se usa `xp_otorgado_autor=0`.
  4. **Misiones nuevas (catalogo 39 -> 41):** `mis_videografo` "Cronicas en Movimiento" (L1304, `xp:15`, `gate_nivel:2`) y `mis_sonidista` "Ecos y Relatos" (L1319, `xp:15`, `gate_nivel:2`), grupo `fotos`, sin DDL.
  5. **Rama GET `?tipo=museo_recurso` (L3695-3777):** `usuario_id`/`id` OPCIONAL (default = dueno de la sesion; sin sesion y sin `usuario_id` -> 400); `visible`/`album_id` opcionales; `limit` 50 (max 200), `offset`. Visibilidad server-side (dueno ve todo; el resto solo `af.visible=true`). Proyeccion real `foto_url` (no `url`), `tipo_media`, `votos` (via `conDegradacionMedia`), `album_titulo`, `ciudad`, `creado_en`.
  6. **Filtros `af.visible=true` en lectores publicos** (incluidos conteos y subqueries de votos): `multimedia_mapa` sin `scope=mio` (L4678), `mis_fotos` (L4822), `museo_publico` `total_fotos`/`votos` (L3596/L3598), `mi_feed_fotos` (L4794), `fotos_top` (L4881), `album_detalle` (L4223/L4226/L4251/L4267) y `galeria_destino` (L4386). `mis_guardados_media` SIN filtro (L4647).
  7. **`barrio` DESCARTADO:** `albumes` no tiene esa columna; se persisten `ciudad`/`region` (L6271-6272).
  8. **`accion=editar`** valida pertenencia por `af.agregador_id = sesion` (L6321-6329) y solo toca `caption`/`visible`/`album_id`/coords; edicion de `url`/`tipo_media` deshabilitada en v1 (requiere cambio de contrato). **`accion=eliminar`** valida por album del usuario y hace soft delete (`activo=false`, Cero Borrado Logico).

- **Archivos en el working tree (SIN commitear):**
  - `api/interacciones.js` (header v22; ramas `museo_recurso` + filtros `visible` + 2 misiones nuevas).
  - `db/migrations/025_album_fotos_visible.sql` (NUEVO, 171 lineas).
  - `scripts/verify_025_precheck.js` (NUEVO, preflight read-only).
  - `mi-perfil.html` (UI del Museo T5/T7; ver TSK-116).

- **Presupuesto de endpoints:** **8/8 INTACTO** (ADR-001/ADR-010). Cero archivos nuevos en `api/`.

- **Evidencia (ADR-006, verificada el 2026-09-18):**
  - Header real `api/interacciones.js` v22 (L1: release compartido ADR-039 + ADR-040 + T4.5). Migracion 025 existe (171 lineas). Existen `niveles-data.js`, `map-picker.js`, `scripts/smoke_niveles_data.js` y `scripts/verify_025_precheck.js`.
  - Conteo real del catalogo `MISIONES`: 41 (`id: 'mis_` x41). `mis_videografo`/`mis_sonidista` con `xp:15` y `gate_nivel:2`.
  - Escudo GOLD (qa-auditor-free, tras correcciones): `node --check` OK; ASCII OK; balance de divs 0; `smoke_niveles_data.js` 31/31; `smoke_test_gamificacion_v4.js` 95/95; `smoke_021_xp_decimal_rankings.js` 45/45; `smoke_038_casas_clases.js` 76/76; `smoke_test_perfil_progreso.js` OK (41 misiones/33 logros); `smoke_test_comunidad.js` OK; `smoke_test_milestones_v2.js` OK; `check_buildHTML_inline.js` OK.

- **PENDIENTE OPERATIVO (bloqueante, lo ejecuta Javier; requiere Neon):**
  1. Aplicar `db/migrations/024_casas_cofre_y_clases.sql` (pendiente de TSK-112) y despues `db/migrations/025_album_fotos_visible.sql` en Neon (cada archivo COMPLETO en una corrida; idempotentes). Correr `scripts/verify_025_precheck.js` (read-only) antes.
  2. **Deploy del backend v22** solo despues de 024 y 025; luego el frontend del Museo (TSK-116) y el acordeon (TSK-115).
  3. Verificacion en vivo: crear recurso foto/video/audio por URL (privado por defecto), activar visible, mover de carpeta, eliminar; confirmar que un tercero jamas ve privados ni en listados ni en conteos.
  4. Rollback (solo emergencia): `DROP COLUMN visible` + `DROP INDEX idx_albumes_usuario_mi_museo` es LOSSY si ya hay recursos v22.

- **Hallazgos / deuda derivada:** smokes preexistentes en rojo (NO causados por esta entrega): `scripts/smoke_036_compartir.js` (espera el header `v19`, ya fallaba en HEAD) y `scripts/test_logros_catalogo.js` (espera 30 logros, real 33 desde ADR-036), registrados en BUGS_HISTORICOS.md; 12 `catch` vacios preexistentes en `mi-perfil.html` (fuera de alcance). BUG-061 y BUG-002 siguen abiertos sin empeorar.

- **Fuera de alcance:** BUG-061/BUG-002/BUG-062; upload real de archivos; filtros de grid y refresh al cambiar de pestana (backlog); verificacion en vivo (post-deploy).

---

### TSK-115: Acordeon de niveles en Mi Perfil (ADR-040) [IMPLEMENTADO EN WORKING TREE]

- **Estado:** **IMPLEMENTADO EN WORKING TREE** (2026-09-18, SIN commitear). Sin migraciones y sin archivos nuevos en `api/`: el backend entra como campos ADITIVOS en el payload existente de `?tipo=misiones` de `api/interacciones.js` v22. **PENDIENTE OPERATIVO (BLOQUEANTE): deploy del backend v22 + frontend (mismo release de TSK-114; aplicar 025 en Neon antes).**
- **Prioridad:** Media
- **Fecha:** 2026-09-18
- **ADR:** DECISIONS.md **ADR-040** (acordeon de niveles). La decision NO se duplica aqui.
- **Responsable / agentes:** architect + architect-review-free (diseno/aprobacion); js-silo-dev-free (`niveles-data.js`, smoke); frontend-tpl-free (acordeon en `mi-perfil.html`); docs-keeper (esta entrada).
- **Precedencia:** comparte el release v22 con TSK-114.
- **Relacion con bugs:** ninguno.

- **Alcance ejecutado:**
  1. **Fuente unica cliente `niveles-data.js` (NUEVO, 9363 bytes):** `XP_LEVELS` (20 niveles) + `CAPACIDADES_DETALLE` + helpers `capacidadesDelNivel(nivel)` y `misionesPorNivel(nivel, misionesData)` + `MISION_GATE_FALLBACK`. Cargado SOLO en `mi-perfil.html` (`<script src="niveles-data.js">`, L988).
  2. **Backend aditivo v22:** `MISION_GATE_XP` (L376) + `nivelDeMisionServidor` (L387) que reusa `calcularNivelLocal`/`NIVELES_LOCAL`; campos `gate_nivel`/`desbloquea`/`nivel` en el payload de `?tipo=misiones` (y `desbloquea` aditivo en `?tipo=logros`).
  3. **Acordeon en `mi-perfil.html`:** `renderNiveles` pasa a tarjetas expandibles con capacidades (chips + howto) y misiones por nivel.
  4. **`GRUPO_NOMBRE` completo** a los 6 grupos reales (general, ciudad, categoria, fotos, artista, perfil).

- **Archivos:** `niveles-data.js` (NUEVO), `scripts/smoke_niveles_data.js` (NUEVO), `api/interacciones.js` v22 (aditivo) y `mi-perfil.html`.

- **Evidencia (ADR-006):** `scripts/smoke_niveles_data.js` **31/31 PASS** (valida umbrales vs `mi-perfil.html`, 20 niveles, 6 grupos, `CAPACIDADES_DETALLE` y fallback de 11); `mi-perfil.html` L988/L1024 cablea la fuente unica; `MISION_GATE_XP`/`nivelDeMisionServidor` presentes en `api/interacciones.js`.

- **Deuda documentada:** `XP_LEVELS` sigue duplicado en `index.html` y `comunidad.html` (swap futuro de 1 linea: `var XP_LEVELS = NivelesData.XP_LEVELS;`); `usuario-session.js` no se toca en v1. Cliente desplegado antes del backend v22 mostrara el acordeon sin misiones ancladas (degradado aceptable).

- **Fuera de alcance:** migraciones SQL; endpoints nuevos; swap de `XP_LEVELS` en index/comunidad; verificacion en vivo.

---

### TSK-116: UI de gestion del Museo + localizacion con pin (T5/T7) [IMPLEMENTADO EN WORKING TREE]

- **Estado:** **IMPLEMENTADO EN WORKING TREE** (2026-09-18, SIN commitear). Consume el contrato v22 de TSK-114. **PENDIENTE OPERATIVO (BLOQUEANTE): deploy del frontend junto al backend v22 (aplicar 024 y 025 en Neon antes).**
- **Prioridad:** Media
- **Fecha:** 2026-09-18
- **ADR:** ADR-039 (decision F ampliada: la UI de gestion del Museo llega como tarea frontend POSTERIOR al contrato) + ENMIENDA 1 de ADR-039.
- **Responsable:** frontend-tpl-free (UI) + docs-keeper (esta entrada).
- **Relacion con bugs:** ninguno; la UI usa la rama nueva con `validarSesion` (no la legacy de BUG-061).

- **Alcance ejecutado:**
  1. **Tab Museo de `mi-perfil.html`:** vista de dueno con CRUD por URL: listar (`GET tipo=museo_recurso` con JWT, incluye privados, L2254), crear (`POST` con url/tipo_media/caption/album_id/visible), editar (caption/visible/mover) y eliminar (soft delete) sobre `mediaCardHTML`; badge publico/privado y boton de toggle de visibilidad (`museoToggleVisible`).
  2. **Selector de carpeta:** opcion "Mi Museo (automatico)" que crea la carpeta si no existe (L2213); check "Mostrar publicamente" (`#museo-f-visible`, default false).
  3. **Localizacion con pin (T7):** contenedor propio `.pf-museo` (L499/L549) y host del modulo compartido `map-picker.js` (L888); orden CDN Leaflet 1.9.4 -> `map-picker.js` -> script inline (L989-991). Validacion de rango de coordenadas Colombia bloqueante.

- **Archivos:** `mi-perfil.html` (tab Museo + localizacion) y `map-picker.js` (compartido; ver TSK-117).

- **Evidencia (ADR-006):** `mi-perfil.html` L858 (hint "Mi Museo"), L862 (`#museo-f-visible`), L905 ("Mi Museo publico"), L2195-2303 (vista de dueno `museo_recurso`, `museoToggleVisible`, badges visible/privado), L888/L989-991 (host y orden de `map-picker.js`); balance de divs y ASCII verificados en el Escudo GOLD.

- **Fuera de alcance:** edicion de link/tipo en v1; filtros de grid y refresh al cambiar de pestana (backlog); verificacion en vivo.

---

### TSK-117: Modulo compartido map-picker.js (refactor anti-duplicidad del selector de coordenadas) [IMPLEMENTADO EN WORKING TREE]

- **Estado:** **IMPLEMENTADO EN WORKING TREE** (2026-09-18, SIN commitear). **PENDIENTE OPERATIVO (BLOQUEANTE): deploy del frontend junto al backend v22.**
- **Prioridad:** Media/Baja
- **Fecha:** 2026-09-18
- **ADR:** no requiere ADR nuevo; implementa la Regla de No-Duplicidad (AGENTS.md seccion 2.1).
- **Responsable:** frontend-tpl-free/js-silo-dev-free + docs-keeper (esta entrada).
- **Relacion con bugs:** ninguno.

- **Alcance ejecutado:**
  1. **`map-picker.js` (NUEVO, 11188 bytes):** modulo compartido del mapa de seleccion de coordenadas con defaults de `admin.html` (`f-lat`, `f-lng`, `esb-mini-map`, `map-picker-modal`, `map-picker-el`, `map-picker-coords`).
  2. **`admin.html` refactorizado:** carga `<script src="map-picker.js">` (L423) y conserva wrappers finos que delegan al modulo (L2212-2214); el CSS/markup del modal se mantiene.
  3. **`mi-perfil.html`** lo reutiliza para la localizacion del Museo (TSK-116).

- **Evidencia (ADR-006):** `map-picker.js` existe; `admin.html` L423 y L2212-2214; `mi-perfil.html` L888/L989-991. Sin cambios en `api/` (8/8).

- **Fuera de alcance:** reescritura de los wrappers de `admin.html`; nuevos consumidores; verificacion en vivo.

---

### TSK-118: Comunicacion oficial (canal broadcast), Casas (tributo configurable, lider automatico y misiones conjuntas), eras/titulos y circulo de rango del admin [IMPLEMENTADO EN WORKING TREE + HOTFIXES POST-QA]

- **Estado:** **IMPLEMENTADO EN WORKING TREE + HOTFIXES POST-QA** (2026-09-18, SIN commitear). Los entregables estan verificados contra el archivo real (ADR-006): la migracion 026 EXISTE (329 lineas), `api/usuarios.js` esta en **v18** (v17 + hotfix J-3), `api/interacciones.js` esta en **v23** (hotfixes J-1/J-2 sobre la base v22), los modales estan en `usuario-session.js`, el badge/bloqueo en `comunidad.html`, la altura + circulo en `admin.html` y los getters en `map-picker.js`. **PENDIENTE OPERATIVO (BLOQUEANTE): aplicar `db/migrations/026_casas_comunicaciones.sql` en Neon (024 y 025 YA aplicadas por indicacion del usuario, 2026-09-18) ANTES del deploy del backend (`api/usuarios.js` v18 + `api/interacciones.js` v23) y del frontend.**
- **Prioridad:** Alta
- **Fecha:** 2026-09-18
- **ADR:** DECISIONS.md **ADR-041** (decisiones a-h de la sesion; verificado contra archivo real, ADR-006). La decision NO se duplica aqui.
- **Responsable / agentes:** architect + architect-review (contrato); sql-security (migracion 026); backend-dev (`api/interacciones.js`, `api/usuarios.js`); frontend-tpl/js-silo-dev (`usuario-session.js`, `comunidad.html`, `admin.html`, `map-picker.js`).
- **Precedencia:** continua a TSK-114..TSK-117 / ADR-039 + ADR-040. `api/usuarios.js` pasa de v16 a **v17** y luego a **v18** (hotfix J-3, 2026-09-18); `api/interacciones.js` pasa de v22 a **v23** con los hotfixes J-1/J-2 (2026-09-18). El detalle esta en la seccion "Hotfixes post-QA" de esta tarea y en `DECISIONS.md` ADR-041.
- **Migracion:** `db/migrations/026_casas_comunicaciones.sql` (NUEVA, **329 lineas**, idempotente ADR-008, ASCII-safe ADR-002: 0 bytes >127 y 0 backticks). La numeracion es **026 (no 019)** por colision con `019_media_guardados_radio.sql` (decision a del ADR-041).
- **Relacion con bugs:** la auditoria QA posterior a la implementacion detecto el IDOR de `casa_tributo_config`, registrado y **CERRADO** como `BUGS_HISTORICOS.md` **BUG-064** (corregido en `api/interacciones.js` v23, hotfix J-2). La decision h del ADR-041 agrega `console.error` a 2 capturas antes silenciosas (`chat_msg`/`casa_tributo_config`). **BUG-061 sigue ABIERTO y los hooks de Casa (`avanzarMisionesCasa`) lo amplifican** (ver `BUGS_HISTORICOS.md` BUG-061); BUG-002 y BUG-062 siguen ABIERTOS y ajenos.

- **Alcance ejecutado (verificado contra archivo real, ADR-006, 2026-09-18):**
  1. **Migracion 026 (5 bloques + backfill + semilla):** `chat_salas.es_oficial boolean DEFAULT false` + semilla idempotente del canal "Anuncios ExploraCO" (icono altavoz como `E'\U0001F4E3'`, tipo `'viajeros'`, `orden=-1`, creador = cuenta admin) + indice unico parcial `uq_chat_salas_oficial`; `casas_cofre.tributo_pct NUMERIC(4,2) DEFAULT 10.00` + `casas_cofre.lider_user_id UUID REFERENCES usuarios(id)` + CHECK `casas_cofre_tributo_pct_check` (0..15); tabla `casa_roles` (`rol IN lider|oficial|mariscal|miembro`, UNIQUE `(casa, usuario_id)`, `activo`); tabla `casa_misiones` (`meta_tipo IN visitas|xp_total|resenas|fotos`, `meta_valor`, `progreso_actual`, `recompensa_xp`, `estado IN activa|completada|expirada`); backfill del lider por `DISTINCT ON (casa) ... ORDER BY xp_total DESC` + poblado/degradacion de `casa_roles`; semilla de 1 mision base por Casa ("Primera Expedicion de Casa": `visitas` 10, 500 XP).
  2. **Canal oficial broadcast (decisiones c, h):** `GET ?tipo=chat_salas` expone `es_oficial`; `POST chat_msg` responde 403 a no-admin cuando la sala es `es_oficial` (acepta Bearer `ADMIN_SECRET` o el email de sesion `brsk84@gmail.com`); NUEVA rama `POST ?tipo=anuncio_oficial` (solo Bearer `ADMIN_SECRET`; texto <= 1000; inserta en la sala oficial con nombre "ExploraCO Oficial"); `comunidad.html` ordena la sala oficial al tope, pinta badge "OFICIAL" y oculta input/boton a no-admin. `usuarios` NO tiene columna `rol`: se rechaza agregarla.
  3. **Casas (decisiones d, e, g):** NUEVA rama `POST ?tipo=casa_tributo_config` (Bearer admin o `lider_user_id` de la Casa; 400 fuera de 0..15); `acreditarClaseYCofre` lee `casas_cofre.tributo_pct` (default 10, clamp 0..15) en lugar del literal `0.10`; `GET ?tipo=casa_ranking` expone `lider_user_id`/`tributo_pct` con degradacion escalonada (42P01 -> sin JOIN; 42703 -> `conLider=false`) y refresca el lider best-effort (3 sentencias) antes de leer; misiones conjuntas `avanzarMisionesCasa` (hooks en `foto`, `resena`, `visita` y `xp_total`) y GET unico `?tipo=casa_misiones`.
  4. **Eras y titulos + modales (decision f):** `usuario-session.js` agrega `TITULOS_POR_NIVEL` (20 titulos), `ERAS` (Mundana 1-5, Patrocinada 6-10, Organizador 11-15, Leyenda 16-20), `getEra` y los modales `mostrarModalNivelUp`/`mostrarModalCambioEra`, disparados desde `aplicarResultadoXp` al detectar subida de nivel. El boton "Ampliar info" dispara `#btn-perfil-viajero` si existe (NO se creo `abrirPerfil`).
  5. **Admin mapa (decision b):** `admin.html` sube la altura del picker de 380 a 500px y agrega `adm_actualizarCirculoRango` (circulo vectorial `L.circle` con el radio de `#f-radio-m`), invocado en `oninput`, `openMapPicker` y `confirmMapPicker`; `map-picker.js` expone `getPickerMap()`/`getMiniMap()` en lugar de asumir `MapPicker._map`.

- **Archivos en el working tree (SIN commitear; `git diff --numstat` verificado el 2026-09-18):**
  - `api/interacciones.js` (+173/-21 acumulado incl. hotfixes; header v22 -> **v23**).
  - `api/usuarios.js` (+66/-11 acumulado incl. hotfix J-3; header v16 -> v17 -> **v18**).
  - `usuario-session.js` (+245/-0).
  - `comunidad.html` (+32/-4).
  - `admin.html` (+30/-4).
  - `map-picker.js` (+3/-1).
  - NUEVO sin versionar: `db/migrations/026_casas_comunicaciones.sql` (329 lineas).

- **Presupuesto de endpoints:** **8/8 INTACTO** (ADR-001/ADR-010). Cero archivos nuevos en `api/`.

- **Evidencia (ADR-006, verificada el 2026-09-18):**
  - Migracion 026: 329 lineas, 0 bytes >127, 0 backticks.
  - Headers reales: `api/usuarios.js` **v18** (v17 + hotfix J-3); `api/interacciones.js` **v23** (entrada de changelog v23 en L18; ver nota de la linea-titulo L1 en deuda/observaciones). Anclas de `api/interacciones.js`: `avanzarMisionesCasa` L360, `chat_salas` con `es_oficial` L3518, `casa_misiones` L5270, `anuncio_oficial` L5769, `casa_tributo_config` L5797/L5824, `validarSesion` en la authz del tributo L5835, degradacion `42703` de `chat_salas` L3537-3539 y de `chat_msg` L5724-5729, tributo configurable en `acreditarClaseYCofre` L338-345. Ancla del hotfix J-3: `api/usuarios.js` `CR_LIDER_REFRESH_MS` L241 y throttle L612-625.
  - `usuario-session.js`: `TITULOS_POR_NIVEL` L82, `getEra` L106, modales L116+.
  - `map-picker.js`: `getPickerMap`/`getMiniMap` L267-268.

- **PENDIENTE OPERATIVO (bloqueante, lo ejecuta Javier; requiere Neon):**
  1. Correr el PREFLIGHT (seccion 0 del `.sql`) y luego aplicar `db/migrations/026_casas_comunicaciones.sql` COMPLETO en Neon. La 024 y la 025 se consideran YA aplicadas (indicacion del usuario, 2026-09-18).
  2. Deploy del backend (`api/usuarios.js` **v18** + `api/interacciones.js` **v23**) DESPUES de la 026.
  3. Deploy del frontend (`usuario-session.js`, `comunidad.html`, `admin.html`, `map-picker.js`).
  4. Verificacion en vivo: canal oficial (anuncio del admin y bloqueo de input a terceros), tributo configurable en `casas_cofre.tributo_pct`, lider por Casa en `casa_ranking`/`casa_roles`, misiones conjuntas, modales de nivel-up/era y circulo de rango en el admin.
  5. Commit + push del release junto con los pendientes de TSK-107..TSK-117 sin commitear (orden 024 -> 025 -> 026 -> backend v23/v18 -> frontend).

- **Hotfixes post-QA (auditoria de la sesion TSK-118 / ADR-041, 2026-09-18):** no cambian el alcance funcional; solo seguridad, degradacion y control de escritura.
  1. **J-2 SEGURIDAD (IDOR corregido) - BUG-064:** en `POST ?tipo=casa_tributo_config` la autorizacion del lider ya NO se resuelve comparando el `usuario_id` del body contra `casas_cofre.lider_user_id`; ahora exige `validarSesion(req, usuarioId2).ok` (JWT, ADR-025) antes de comparar (L5835). Antes, cualquiera podia leer `lider_user_id` del ranking publico (`GET ?tipo=casa_ranking`) y enviar ese uuid en el body para spoofear la autorizacion. Registrado y **CERRADO** como BUG-064.
  2. **J-1 (degradacion 42703):** `GET ?tipo=chat_salas` y `POST chat_msg` reintentan la MISMA consulta con `false AS es_oficial` si la migracion 026 aun no esta aplicada, de modo que el listado de salas y el envio de mensajes NO se rompen (patron BUG-021/BUG-060). En `chat_msg` se elimino la captura silenciosa: el fallo no-42703 se registra con `console.error` y se re-lanza (AGENTS.md 2.2).
  3. **J-3 (amplificacion de escritura en GET publico):** `api/usuarios.js` v18 aplica un throttle de 60 s por instancia (`CR_LIDER_REFRESH_MS`, cache de proceso) al refresco del lider en `GET ?tipo=casa_ranking`, limitando las 3 escrituras (`UPDATE casas_cofre` + upsert/degradacion de `casa_roles`) sin alterar las lecturas del ranking. Con multiples instancias serverless hay hasta N refrescos/min (N = instancias activas): es una mitigacion, no una eliminacion.
  4. **Escudo GOLD post-hotfix (2026-09-18):** `node --check` OK en 4 archivos (`api/interacciones.js`, `api/usuarios.js`, `usuario-session.js`, `map-picker.js`); ASCII-safe 0 bytes >127 en `api/`; balance de divs 0 (`admin.html`/`comunidad.html`); presupuesto 8/8 funciones INTACTO.

- **Deuda / observaciones (patron ADR-006):**
  - No hay misiones semilla diferenciadas por Casa: la 026 siembra UNA mision base identica para las 3 Casas.
  - `casa_roles` solo puebla el rol `lider`; `oficial`/`mariscal`/`miembro` quedan sin flujo de asignacion en v1.
  - El header de `api/interacciones.js` quedo en **v23** con entrada de changelog en L18 (canal oficial con degradacion 42703, authz de `casa_tributo_config` por `validarSesion` y fix del IDOR del lider). Nota ADR-006: la linea-titulo L1 aun rotula `v22` (drift menor de la linea descriptiva, sin efecto funcional).
  - J-3 MITIGADO por throttle de 60 s POR INSTANCIA (cache de proceso, no distribuida): con N instancias activas hay hasta N refrescos/min.
  - J-1 MITIGADO con degradacion 42703 en `chat_salas`/`chat_msg`, pero la 026 SIGUE siendo obligatoria antes del deploy del backend.
  - BUG-061 (`POST tipo='foto'` sin `validarSesion`) sigue ABIERTO y los hooks `avanzarMisionesCasa` (foto/resena/visita) lo amplifican al escribir a nombre del `usuario_id` recibido.
  - El circulo de rango del admin no se ha validado en produccion (depende del deploy).
  - `avanzarMisionesCasa` degrada con `console.warn` (42P01) si la 026 aun no esta aplicada; no bloquea la entrega de XP.

- **Fuera de alcance:** `usuarios.rol` (RECHAZADO); endpoint `casa_misiones` en `usuarios.js` (RECHAZADO); funcion `entregarXp` (no existia); `abrirPerfil` (no existia); misiones diferenciadas por Casa; asignacion de roles distintos de `lider`; verificacion en vivo (post-deploy); BUG-061/BUG-002/BUG-062 (BUG-064 SI se corrigio en el hotfix J-2).

---

### TSK-119: Paquete 18-sep-2026 (DB-01/DB-02, BE-02, FE-01, FE-02, FE-03 y remediacion de fotos) -- migracion 027 zonas/marcas/patrocinios, fix galeria R10, ajustes de perfil/mapa y cleanup de fotos de brsk84 [IMPLEMENTADO EN WORKING TREE]

- **Estado:** **IMPLEMENTADO EN WORKING TREE** (2026-09-18, SIN commitear). Verificado contra archivo real (ADR-006): existe `db/migrations/027_zonas_marcas.sql` (348 lineas, ASCII-safe: 0 bytes >127, emojis via escape `U&'\+xxxxxx'`); existen `scripts/verify_027_precheck.js` (258 lineas), `scripts/diagnose_fotos_brsk84.js` (310 lineas) y `db/cleanups/002_fix_fotos_brsk84.sql` (151 lineas). Los conteos de lineas son referenciales (ADR-006). **PENDIENTE OPERATIVO (BLOQUEANTE): aplicar la 027 y el cleanup 002 en Neon** (no hay `DATABASE_URL` local).
- **Prioridad:** Alta
- **Fecha:** 2026-09-18
- **Origen:** paquete `prompt.md` (untracked) "Modulos nuevos + bugs activos"; los tickets DB-01/DB-02/BE-02/FE-01/FE-02/FE-03 corresponden a ese paquete. BE-01 (`marca_activar`/`marca_patrocinar`/`mi_marca`) se desglosa en TSK-120..TSK-122.
- **ADR:** DECISIONS.md **ADR-042** (esquema zonas geograficas + modulo Marcas/patrocinios + extension de consumibles) y **ADR-043** (patron "contenedor persistente separado del host de inyeccion", derivado de la regresion FE-02).
- **Responsable / agentes:** sql-security (migracion 027 y cleanup 002); backend-dev (`api/pagina-destino.js`); frontend-tpl/js-silo-dev (`mi-perfil.html`, `index.html`); qa-auditor (Escudo GOLD + re-QA runtime); docs-keeper (esta entrada).
- **Precedencia:** continua a TSK-118 / ADR-041. NO crea archivos en `api/` (presupuesto 8/8, ADR-001/ADR-010).
- **Migracion:** `db/migrations/027_zonas_marcas.sql` (NUEVA, 348 lineas, idempotente ADR-008, ASCII-safe ADR-002: 0 bytes >127). La numeracion es **027** (consecutivo real tras la 026); el prompt la rotulaba `001_zonas_marcas.sql`.
- **Relacion con bugs:** abre `BUGS_HISTORICOS.md` **BUG-065** (el endpoint legacy `album_agregar_foto` inserta sin `visible`, por lo que las fotos nacen privadas con el `DEFAULT false` de la 025; causa raiz probable del sintoma de brsk84) y **BUG-066** (regresion FE-02: `innerHTML=` sobre `#arbol-clases` destruia `#pf-clase` en runtime; corregida en la misma sesion con `#arbol-body`). BUG-002 y BUG-061 siguen ABIERTOS y ajenos.

- **Alcance ejecutado (verificado contra archivo real, ADR-006, 2026-09-18):**
  1. **DB-01/DB-02 -> migracion 027 (NUEVA):** tablas `zonas_geograficas` (5 zonas, emoji via `U&'\+01F30A'`/`+01F333`/`+0026F0`/`+01F33E`/`+01F40D`, L120-124), `areas_geograficas` (lat/lng/radio_km; SIN filas sembradas), `ranking_zonas` (`recurso_tipo` default `'album_fotos'`, scores area/ciudad/zona + indices), `marcas` (`usuario_id UUID UNIQUE` FK a `usuarios`, `areas_influencia`/`enlaces` JSONB, `nivel_requerido` default 5) y `patrocinios` (`marca_id` FK a `marcas`; `objetivo_id` polimorfico SIN FK = deuda documentada). Extension `consumibles` (`marca_id`, `stock_total`, `stock_usado`, `precio_xp_base`/`precio_xp_actual NUMERIC(12,2)` por consistencia con 021, `tipo_canje`) y vista `consumibles_precio` (precio efectivo oferta/demanda). NUEVO `scripts/verify_027_precheck.js` (read-only, exit 0).
  2. **BE-02 -> `api/pagina-destino.js` L2644:** `destinos_fotos ... LIMIT 24 -> LIMIT 200` (fix R10: el hostal con >24 fotos no enviaba las restantes; `buildHTML()` ya limita la galeria curada a 1 grande + 12 miniaturas). Comentario actualizado en L2642. `node --check` OK; ASCII 0 bytes >127.
  3. **FE-01 -> `mi-perfil.html`:** la seccion "Fotos publicadas" SE CONSERVA, pero visible SOLO para `brsk84@gmail.com` (`id="mis-fotos-title"` L678; helper unico `esCuentaFotosPublicadas()` L2143; init condicional L1194-1198 con `setStyle(...'none')` para el resto; refrescos de `cargarMisFotos()` condicionados L2486/L2503/L2514). NO se toco `cargarMediaGrid` ni la seccion Guardados. **Desviacion de alcance O1:** el prompt ofrecia eliminar el bloque global o condicionarlo; se ejecuto la opcion condicional de producto (solo la cuenta admin).
  4. **FE-02 -> `mi-perfil.html`:** fusion "Mi Clase" -> "Arbol de Clases": el titulo pasa a "Clase & Arbol de Progreso" (L953) y `#pf-clase` queda DENTRO de `#arbol-clases` (L954-960); `#modal-clase` no se toco.
  5. **FE-02 FIX de regresion -> `#arbol-body`:** QA detecto en runtime que `arbolPintar()` (L3639) y `cargarArbolClases()` (L3655) hacian `innerHTML=` sobre `#arbol-clases` y destruian `#pf-clase` (hijo anidado). Se introdujo `<div id="arbol-body">` (L957) como host EXCLUSIVO de la inyeccion dinamica; `#pf-clase` queda como hijo directo persistente. Patron identico a BUG-020/TSK-065 (UI desconectada detectada solo en runtime). Re-QA con parser DOM + `node vm`: APTO. Ver **BUG-066** y **ADR-043**.
  6. **FE-03 -> `index.html`:** NUEVA clase CSS `.mpa-media-pin-video` (L544, cuadrado redondeado rojo `#e74c3c`) y condicional en `mapaMediaIcon()` (L2996) que la aplica SOLO a video individual (`!esAlbumDestino && !esDestino && tipo === 'video'`), distinto del pin de album (`-album`) y de destino (`-dest`).
  7. **Remediacion de fotos de brsk84:** NUEVOS `scripts/diagnose_fotos_brsk84.js` (read-only, solo SELECT) y `db/cleanups/002_fix_fotos_brsk84.sql` (idempotente, soft-delete: `visible=false`/`activo=false` para `foto_url` vacia; NO borra filas, Regla de Oro 3). Hallazgo del agente: el endpoint legacy `album_agregar_foto` de `api/interacciones.js` (~L6663-6667) hace `INSERT ... RETURNING *` SIN `visible`; como la 025 dejo `DEFAULT false`, las fotos subidas por esa via nacen privadas aunque el conteo de misiones las cuente como publicadas. Esto explica el sintoma de brsk84 (5 figuran publicadas y no se ven) -> **BUG-065**.

- **Archivos en el working tree (SIN commitear):**
  - `db/migrations/027_zonas_marcas.sql` (NUEVO, 348 lineas).
  - `scripts/verify_027_precheck.js` (NUEVO, 258 lineas).
  - `scripts/diagnose_fotos_brsk84.js` (NUEVO, 310 lineas).
  - `db/cleanups/002_fix_fotos_brsk84.sql` (NUEVO, 151 lineas).
  - `api/pagina-destino.js` (M, LIMIT 24 -> 200; header sin bump).
  - `mi-perfil.html` (M; FE-01 + FE-02 + `#arbol-body`).
  - `index.html` (M; FE-03).

- **Presupuesto de endpoints:** **8/8 INTACTO** (ADR-001/ADR-010). Cero archivos nuevos en `api/`.

- **Evidencia (ADR-006, verificada el 2026-09-18):**
  - `db/migrations/027_zonas_marcas.sql`: 348 lineas, 0 bytes >127; emojis L120-124.
  - `api/pagina-destino.js` L2644: exactamente 1 ocurrencia `destinos_fotos ... LIMIT 200`; bytes >127 = 0.
  - `api/usuarios.js`: 1398 lineas, bytes >127 = 0 (la migracion y los scripts tambien en 0).
  - `mi-perfil.html`: divs 446/446; `#arbol-body` L957; `arbolPintar` L3639 y `cargarArbolClases` L3655 apuntan a `#arbol-body`; `esCuentaFotosPublicadas` L2143; init condicional L1194.
  - `index.html`: divs 523/523; `.mpa-media-pin-video` con 2 ocurrencias (CSS L544 + HTML generado L2996).
  - `db/cleanups/002_fix_fotos_brsk84.sql` L108-121: UPDATE acotado por email y estado exacto.

- **PENDIENTE OPERATIVO (bloqueante, lo ejecuta Javier; requiere Neon):**
  1. **APLICAR `db/migrations/027_zonas_marcas.sql` en Neon** (correr antes `node scripts/verify_027_precheck.js` y las secciones 0/final del `.sql`; re-ejecutar es no-op, ADR-008). Sin la 027, las ramas `marca_*`/`mi_marca` de TSK-120..TSK-122 fallan por tabla inexistente (patron BUG-021/BUG-060).
  2. **APLICAR `db/cleanups/002_fix_fotos_brsk84.sql`** (respaldo previo del bloque [0]; idempotente). Requiere `album_fotos.visible` (025 ya aplicada por indicacion del usuario).
  3. **Correr `node scripts/diagnose_fotos_brsk84.js` con `DATABASE_URL`** para confirmar la causa de las 5 fotos de brsk84 (reporte JSON; solo SELECT).
  4. **Commit + push + deploy** de los 7 archivos + este cierre documental.

- **Deuda / observaciones (patron ADR-006):**
  - `areas_geograficas` queda SIN filas: falta sembrar areas reales con lat/lng (propuesta: OSM) y decidir el radio de asignacion automatica.
  - `patrocinios.objetivo_id` es polimorfico SIN FK (no existen tablas `eventos`/`artistas`/`misiones`; el "parche" real es `pandillas`); la integridad del objetivo queda en el backend.
  - `marcas.areas_influencia` se actualiza con `||` (concatenacion de arrays JSONB): puede DUPLICAR slugs en reenvios; falta dedupe server-side.
  - `GET ?tipo=mi_marca` NO valida sesion (decision pendiente): hoy es lectura publica por `usuario_id`.
  - `marcas.nivel_requerido` (default 5) NO gobierna el gate: el backend usa `calcularNivel(xp_total).nivel >= 5` hardcodeado (correcto, porque `usuarios.nivel` esta stale); decidir si la columna pasa a gobernar.
  - `api/usuarios.js` NO subio de header (sigue **v18** de TSK-118); las 3 ramas nuevas no agregaron entrada de changelog -> version drift a corregir en el commit. `api/pagina-destino.js` tampoco subio por el fix de 1 linea.

- **Fuera de alcance:** UI de creacion de Marcas/patrocinios (solo backend en esta sesion); siembra de `areas_geograficas`; thumbnails de video (item 2 del prompt); admin de vocaciones (ADM-01: ya existe, no tocar); autenticacion de `GET mi_marca`; BUG-002/BUG-061/BUG-062; el archivo borrado ajeno `prompt_maestro_comunicacion_casas.md` y el untracked `prompt.md` (no se incluyen en este release).

---

### TSK-120: Marca del usuario -- rama `POST ?tipo=marca_activar` en `api/usuarios.js` [IMPLEMENTADO EN WORKING TREE]

- **Estado:** IMPLEMENTADO EN WORKING TREE (2026-09-18, SIN commitear). Verificado contra archivo real (ADR-006): rama en `api/usuarios.js` L1192-1232. **PENDIENTE OPERATIVO (BLOQUEANTE): aplicar migracion 027 en Neon (crea `marcas`) antes del deploy.**
- **Prioridad:** Alta
- **Fecha:** 2026-09-18
- **ADR:** DECISIONS.md ADR-042 (tabla `marcas`).
- **Origen:** BE-01 (paquete `prompt.md`).
- **Responsable / agentes:** backend-dev + docs-keeper.
- **Alcance ejecutado:**
  1. NUEVA rama `POST { tipo:'marca_activar', usuario_id, nombre, logo_url?, banner_url?, descripcion?, areas_influencia?, enlaces? }`.
  2. Auth por `validarSesionUsuario(req, usuario_id)` con `.ok` (JWT, ADR-025); 401 si no autoriza.
  3. Gate de nivel: `calcularNivel(xp_total).nivel >= 5` (NO la columna `usuarios.nivel`, que esta STALE); 403 por debajo. Nota ADR-006: el prompt original leia `usuarios.nivel`; se corrigio a la funcion derivada.
  4. UPSERT por `ON CONFLICT (usuario_id) DO UPDATE` con MERGE JSONB: `areas_influencia = marcas.areas_influencia || EXCLUDED.areas_influencia` y `enlaces = marcas.enlaces || EXCLUDED.enlaces` (ADR-003); `logo_url`/`banner_url`/`descripcion` con `COALESCE`; `activa=TRUE`. `RETURNING id, nombre, activa, verificada`.
- **Evidencia (ADR-006):** `api/usuarios.js` L1192 (comentario), L1197 (`if (c.tipo === 'marca_activar')`), L1200 (`validarSesionUsuario`), L1207 (`calcularNivel(...).nivel < 5`), L1211-1231 (UPSERT + RETURNING).
- **Deuda:** header de `api/usuarios.js` sin bump (v18); `areas_influencia` sin dedupe.
- **Fuera de alcance:** UI de activacion de Marca; verificacion de `logo_url`/`banner_url` (solo se truncan a 512).

### TSK-121: Patrocinio de Marca -- rama `POST ?tipo=marca_patrocinar` en `api/usuarios.js` [IMPLEMENTADO EN WORKING TREE]

- **Estado:** IMPLEMENTADO EN WORKING TREE (2026-09-18, SIN commitear). Rama en `api/usuarios.js` L1234-1266. **PENDIENTE OPERATIVO (BLOQUEANTE): migracion 027 (crea `patrocinios`).**
- **Prioridad:** Alta
- **Fecha:** 2026-09-18
- **ADR:** DECISIONS.md ADR-042 (tabla `patrocinios` + deuda polimorfica).
- **Origen:** BE-01 (paquete `prompt.md`).
- **Responsable / agentes:** backend-dev + docs-keeper.
- **Alcance ejecutado:**
  1. NUEVA rama `POST { tipo:'marca_patrocinar', usuario_id, tipo_objetivo, objetivo_id, xp_aportada?, fama_bonus?, branding_data? }`.
  2. Auth por `validarSesionUsuario(req, usuario_id).ok`; 401 si no autoriza.
  3. Valida `tipo_objetivo` en `['evento','artista','parche','mision']` (400 fuera de lista) y exige `objetivo_id`.
  4. Verifica que la Marca es del usuario y esta activa (`marcas activa=TRUE`); 404 si no existe.
  5. `xp_aportada`/`fama_bonus` con `Math.max(0, parseInt(...))`; `branding_data` JSONB; `INSERT ... RETURNING id` -> `{ok:true, patrocinio_id}`.
- **Evidencia (ADR-006):** `api/usuarios.js` L1234 (comentario), L1238 (`if (c.tipo === 'marca_patrocinar')`), L1247 (`TIPOS_VALIDOS`), L1251-1254 (`SELECT id FROM marcas ... activa=TRUE`), L1260-1264 (`INSERT INTO patrocinios`).
- **Deuda:** `objetivo_id` SIN FK (no existen esas tablas; ver ADR-042); NO se valida la EXISTENCIA real del objetivo en runtime (solo el tipo) -> patrocinio huerfano posible.
- **Fuera de alcance:** efectos economicos del patrocinio (`xp_aportada`/`fama_bonus` no se acreditan a nadie en v1); UI.

### TSK-122: Perfil de Marca propia -- rama `GET ?tipo=mi_marca` en `api/usuarios.js` [IMPLEMENTADO EN WORKING TREE]

- **Estado:** IMPLEMENTADO EN WORKING TREE (2026-09-18, SIN commitear). Rama en `api/usuarios.js` L296-306 (antes de `leaderboard`). **PENDIENTE OPERATIVO (BLOQUEANTE): migracion 027 (crea `marcas`/`patrocinios`).**
- **Prioridad:** Media
- **Fecha:** 2026-09-18
- **ADR:** DECISIONS.md ADR-042.
- **Origen:** BE-01 (paquete `prompt.md`).
- **Responsable / agentes:** backend-dev + docs-keeper.
- **Alcance ejecutado:**
  1. NUEVA rama `GET ?tipo=mi_marca&id=UUID` (acepta tambien `usuario_id`).
  2. `SELECT m.*` + subquery `COUNT(*)::int FROM patrocinios WHERE marca_id=m.id AND activo=TRUE AS total_patrocinios`; `LIMIT 1`.
  3. Responde `{ok:true, data:<marca|null>}`.
- **Evidencia (ADR-006):** `api/usuarios.js` L296 (`// ---- GET: mi_marca (TSK-122)`), L297 condicional, L299-305 consulta + subquery.
- **Deuda / decision pendiente:** la rama NO exige sesion (lectura publica por `usuario_id`) -> decidir si `mi_marca` debe ser owner-only con `validarSesionUsuario`. No expone datos sensibles hoy (nombre/logo/descripcion/enlaces), pero es una superficie enumerable.
- **Fuera de alcance:** edicion/desactivacion de Marca desde esta rama; listado de patrocinios detallado.

### TSK-123: Correccion "Comunidad > pestana Audiovisual" -- tarjetas interactivas en "Media reciente", exclusion opt-in del album "Mi Museo" y abstraccion compartida `media-actions.js` [IMPLEMENTADO EN WORKING TREE]

- **Estado:** IMPLEMENTADO EN WORKING TREE (2026-09-18, SIN commitear). Verificado contra archivo real (ADR-006): `api/interacciones.js` (`git diff --numstat` +63/-4), `comunidad.html` (+78/-7), `galeria.html` (+17/-76) y NUEVO `media-actions.js` (259 lineas, untracked). Los conteos de lineas de diff son referenciales (ADR-006): el baseline es el archivo real.
- **Prioridad:** Alta (bug de producto visible: "Media reciente" en modo read-only y album auto-creado ruidoso en la grilla).
- **Fecha:** 2026-09-18
- **Origen:** reporte directo del usuario: en Comunidad > Audiovisual, "Media reciente" mostraba las tarjetas sin like/comentar/guardar y "Albumes de la comunidad" incluia el album auto-creado "Mi Museo" de los usuarios.
- **ADR:** DECISIONS.md **ADR-044** (abstraccion compartida `media-actions.js`, patron anti-duplicidad).
- **Responsable / agentes:** js-silo-dev/frontend-tpl (`media-actions.js` + refactor de `galeria.html`), frontend-tpl/backend-dev (`comunidad.html`), backend-dev (`api/interacciones.js`), qa-auditor (Escudo GOLD), docs-keeper (esta entrada).
- **Precedencia:** continua a TSK-119..TSK-122. NO crea archivos en `api/` (presupuesto 8/8 intacto, ADR-001/ADR-010); SI crea 1 asset frontend (`media-actions.js`, no cuenta contra el presupuesto de funciones serverless).
- **Contrato de backend (header sin bump: sigue v23):**
  1. `GET ?tipo=mi_feed_fotos` (~L4853-4912): param OPCIONAL `usuario_id` (si no es UUID valido se IGNORA en vez de tirar 400, para no romper el feed publico). Devuelve `autor_id` (`af.autor_original_id`, la MISMA columna que usa el 403 de `media_voto`, de modo que `es_propia` coincide con el backend), `es_propia`, `ya_votado` (subquery `media_votos`) y `ya_guardado`. El `ya_guardado` se calcula en una query SEPARADA envuelta en `conDegradacionMedia(..., 'media_guardados', [])` para que un 42P01 (migracion 019 ausente) no tumbe el feed entero.
  2. `GET ?tipo=albumes` (~L4252-4293): param OPT-IN `excluir_museo=1|true` agrega `AND LOWER(a.titulo) <> 'mi museo'`. Sin el param el contrato queda intacto (galeria.html/museo_publico no cambian).
  3. `GET ?tipo=album_detalle` (~L4296-4364): ademas del `ya_votado` preexistente, devuelve `ya_guardado` y `es_propia` por foto (query separada degradable para guardados, misma `af.autor_original_id`).
- **Frontend - NUEVO `media-actions.js` (raiz, 259 lineas, untracked):** abstrae `window.MediaActions.{voto,guardar,sync,bind}` extraida de `galeria.html` (Regla de No-Duplicidad, AGENTS.md 2.1). `voto` envia `media_voto` con Bearer (`authHeaders`) y maneja `esPropia` (toast, sin POST) y sin-sesion (`pedirLogin`); `guardar` alterna `guardar_media`/`quitar_guardado_media`; `sync`/`bind` leen/escriben por data-attributes `data-ma-*`. Contrato documentado en la cabecera del archivo. ASCII-safe (0 bytes >127, verificado).
- **Frontend - `galeria.html`:** refactor para consumir `media-actions.js` (script L242; `MediaActions.bind`/`sync` L563-565); SE ELIMINARON `gPostJson`, `gPintaVoto`, `gMediaVoto` y `gMediaGuardar`. Comportamiento preservado (like con XP, guardado con toast) y boton Compartir intacto.
- **Frontend - `comunidad.html`:** `feedCardAV` (L2145) con barra inline like/comentarios/guardar via `avActLikeHTML`/`avActSaveHTML` (L2083-2098) + `avBindMediaActions`/`avSyncMediaActions` (L2107-2113); like/guardar tambien en las fotos del modal de album (L1962); `excluir_museo=1` en `cargarAlbumesAV` (L2037); `usuario_id` en los fetch de `mi_feed_fotos` (L2128) y `album_detalle` (L1936) con helper `avUidActual()` (L565); script `media-actions.js` cargado en L499.
- **Fix del bug de duplicacion de albumes:** `cargarAudiovisual(reset)` (L2022-2026) ahora llama `cargarAlbumesAV(!reset)` (L2024); antes el `append` quedaba invertido y al cambiar de orden se duplicaban los albumes sobre la grilla existente. Registrado como **BUG-067 (CERRADO)**.
- **Evidencia / Escudo GOLD (verificado en esta sesion):** `node --check` OK en `api/interacciones.js` y `media-actions.js`; ASCII 0 bytes >127 en `media-actions.js`; balance de divs `comunidad.html` 307/307 y `galeria.html` 84/84; smoke Node vm de `media-actions.js` **41/41 PASS** (ad-hoc, NO versionado en `scripts/` -- ver deuda D-14); QA APTO sin bloqueantes.
- **Relacion con bugs:** abre y cierra **BUG-067** (append invertido en `cargarAlbumesAV`); agrega nota de amplificacion a **BUG-061** (los nuevos botones Guardar ensanchan la superficie de `guardar_media`, que confia en `body.usuario_id` sin Bearer). **BUG-065 (album_foto.visible) sigue ABIERTO** y afecta que media aparezca en el feed. **BUG-002/BUG-061/BUG-062 siguen ABIERTOS y ajenos.**
- **Deuda / observaciones (no bloqueantes):** (D-10) `MediaActions` guarda los `opts` a nivel de modulo (el ultimo `bind` gana); hoy inocuo porque comunidad pasa los mismos opts a 2 roots, pero conviene encapsular por-root si se reutiliza en mas paginas. (D-11) la lectura por `usuario_id` en `mi_feed_fotos`/`album_detalle` permite observar booleanos `ya_votado`/`ya_guardado` de un usuario sin sesion (enumeracion de baja severidad). (D-12) el boton de comentarios del feed no muestra contador inicial (`data-ac-btn-count` solo en el modal). (D-13) `index.html` conserva su propia implementacion inline de `media_voto` (duplicacion pendiente de migrar a `media-actions.js`). (D-14) el smoke 41/41 no esta versionado.
- **Pendiente operativo:** aplicar/confirmar en Neon las migraciones **019** (`media_guardados`) y **023** para que el guardado real funcione; sin ellas la app degrada a `ya_guardado=false` (patron BUG-021/BUG-060). Confirmar tambien el fix en vivo tras el deploy del backend v23 + frontend.
- **Archivos en el working tree (SIN commitear):** `media-actions.js` (NUEVO, untracked); `api/interacciones.js` (M); `comunidad.html` (M); `galeria.html` (M).
- **Fuera de alcance:** migrar `index.html` a `media-actions.js`; auth de `guardar_media`/`quitar_guardado_media` (BUG-061); fix de BUG-065; versionar el smoke de `media-actions.js`.

## Prioridad SESION EXPRESS 2026-09-18/19 - "modo express" (skill `express-mode`)

> Cierre documental en un solo pase (AI-DOS Cap. 9.9) de la sesion ejecutada en
> "modo express" (skill `express-mode`, ver TSK-132). Origen: pedido directo de
> UI/UX + fixes de media. Numeracion: el ultimo TSK real antes de esta sesion es
> **TSK-123** (verificado, ADR-006); las tareas nuevas van **TSK-124..TSK-132**.
> IMPORTANTE (ADR-006): el contexto de relevo describia estos cambios como "sin
> commitear"; contra archivo real la mayor parte YA ESTA COMMITEADA en `main`
> (commits `26d2e3c`, `66db2e6`, `604fa0d`, `d309e17`, `b41e3ba`, `68e50a4` y
> `dfde7e7`). Solo siguen en working tree sin commitear: los fixes de mapa/votos
> de TSK-130/TSK-131 (`api/interacciones.js`, `api/pagina-destino.js`) y los
> assets/docs del modo express de TSK-132.

### TSK-124: Quitar la seccion "Fotos publicadas" del museo propio (`mi-perfil.html`) [COMPLETADA]

- **Estado:** COMPLETADA (commit `26d2e3c`, 2026-09-18). Verificado contra archivo real (ADR-006).
- **Prioridad:** Media (limpieza de UI; el inventario de museo se unifica en Guardados + gestion T5).
- **Fecha:** 2026-09-18
- **Origen:** pedido del usuario de simplificar el museo propio (la grilla "Fotos publicadas" era de solo lectura y duplicaba informacion ya presente en la gestion del Museo).
- **Responsable / agentes:** frontend-tpl (`mi-perfil.html`), docs-keeper (esta entrada).
- **Detalle:** `mi-perfil.html` elimina el titulo `#mis-fotos-title`, la grilla `#mis-fotos-grid`, el helper `esCuentaFotosPublicadas()` y el loader `cargarMisFotos()`, junto con sus llamadas en `renderPerfil()`, `museoGuardar()`/`museoEliminar()`/`museoToggleVisible()` y `pfTab('clase')`. El tab Museo conserva "Guardados (fotos y albumes)" (`mis_guardados_media`) y la gestion CRUD por URL del T5 (ADR-039). Cero endpoints nuevos (8/8 intacto).
- **Evidencia (ADR-006):** commit `26d2e3c` (`mi-perfil.html` +3/-32); grep `Fotos publicadas`/`esCuentaFotosPublicadas`/`cargarMisFotos` = 0 en el archivo real; balance de divs de `mi-perfil.html` sin cambios estructurales.
- **Relacion con bugs:** hereda la deuda previa de los `catch` vacios de `mi-perfil.html` (D-4), no la amplia.
- **Fuera de alcance:** la gestion T5 del Museo (ADR-039) y los guardados privados quedan como estaban.

### TSK-125: Popup de detalle de "Media reciente" reutilizando el modal de album (`comunidad.html`) [COMPLETADA]

- **Estado:** COMPLETADA (commit `d309e17`, 2026-09-18). Verificado contra archivo real (ADR-006).
- **Prioridad:** Media (UX: las tarjetas del feed Audiovisual no tenian vista grande ni acciones completas).
- **Fecha:** 2026-09-18
- **Origen:** continuacion de TSK-123/ADR-044 (tarjetas interactivas en "Media reciente").
- **Responsable / agentes:** frontend-tpl (`comunidad.html`), docs-keeper (esta entrada).
- **Detalle:** `avMediaHTML(item, large)` gana el parametro `large` (media a pantalla completa para foto/video/audio); NUEVO `abrirMediaModal(f)` reutiliza el modal existente `#av-album-modal` con titulo dinamico `#av-album-bar-title` y pinta media + like/comentarios/guardar (`avActLikeHTML`/`avActSaveHTML`, `AlbumComments.toggle`, `avBindMediaActions`/`avSyncMediaActions`); `feedCardAV` marca la tarjeta clickeable y abre el popup ignorando clics dentro de `.av-feed-actions` (Regla de No-Duplicidad: no se creo modal nuevo).
- **Evidencia (ADR-006):** `comunidad.html` (`abrirMediaModal` L2035, `avMediaHTML` L1908, `feedCardAV` L2235-2253, modal `#av-album-modal` L514); balance de divs de `comunidad.html` 307/307; `media-actions.js` cargado (L543).
- **Relacion con bugs:** reusa la superficie de `guardar_media` (nota de amplificacion de BUG-061) y depende de `media-actions.js` (ADR-044).
- **Pendiente operativo:** confirmar en vivo tras el deploy; requiere las migraciones 019/023 para el guardado real.

### TSK-126: Galeria ampliada en 2 bloques (curadas / comunidad) y sin tope artificial de 12 (`galeria.html`) [COMPLETADA]

- **Estado:** COMPLETADA (commit `b41e3ba`, 2026-09-18). Verificado contra archivo real (ADR-006).
- **Prioridad:** Media (la galeria del destino truncaba las curadas a 12 y no separaba comunidad).
- **Fecha:** 2026-09-18
- **Origen:** pedido del usuario de ver todas las fotos del lugar y distinguir curadas de aportes de la comunidad.
- **Responsable / agentes:** js-silo-dev (`api/interacciones.js`), frontend-tpl (`galeria.html`), docs-keeper (esta entrada).
- **Detalle:** en `galeria.html`, `gLoadDestino` separa `curadaItems` (`origen='curada'`) y `comItems` (`origen!=='curada'`): pinta las curadas en `#g-sec-dest` con paginacion cliente 12/pagina (`gGalRenderPage`/`gGalLoadMore`) y los aportes de la comunidad en `#g-sec-com` (`gFillGrid`); la rama `galeria_destino` deja de truncar con `gdFotos.slice(0,12)` y entrega TODAS las fotos (`gdFotos.forEach`), apoyandose en el `LIMIT 200` de `destinos_fotos` (fix R10, TSK-119). Cero endpoints nuevos (8/8 intacto).
- **Evidencia (ADR-006):** commit `b41e3ba` (`api/interacciones.js` +4/-1, `galeria.html` +15/-4); `galeria.html` `gLoadDestino` L762-832 (`curadaItems`/`comItems` L798-799, `g-sec-com` L814-815); grep `slice(0, 12)` = 0 en la rama.
- **Relacion con bugs:** ninguno abierto propio; mejora la visibilidad de la media publica (dependiente de `af.visible=true`, ADR-039).
- **Fuera de alcance:** el modo comunitario global de la galeria (sin `?destino=`).

### TSK-127: Fusion de "Clase" + "Tabla de Destino" + "Vocaciones" dentro del "Arbol de Progreso" (`mi-perfil.html`) [COMPLETADA]

- **Estado:** COMPLETADA (commits `66db2e6` y `604fa0d`, 2026-09-18). Verificado contra archivo real (ADR-006).
- **Prioridad:** Alta (consolidacion de la UI de progresion; eliminaba pestanas/sub-vistas redundantes).
- **Fecha:** 2026-09-18
- **Origen:** pedido del usuario de unificar la progresion del perfil en un solo lugar ("Arbol de Progreso").
- **Responsable / agentes:** frontend-tpl (`mi-perfil.html`), qa-auditor (QA runtime de anidacion), docs-keeper (esta entrada).
- **Detalle:** el tab "Clase" pasa a rotularse **"Progreso"** y el titulo a **"Arbol de Progreso"**; se retiran del DOM/JS: el widget `#pf-clase` + `#modal-clase` (Clase Rising Star), la Tabla de Destino (`cargarTablaDestino`/`renderTablaSVG`/`#pf-tabla` y el pseudo-tab `senderos`) y la grilla de Vocaciones (`cargarVocaciones`/`arbolVocacionesHtml`/`#pf-vocaciones-grid`). `renderPerfil()` y `pfTab('clase')` dejan de invocarlas y toda la progresion se absorbe en el Arbol de Clases/Progreso, cuyo host de inyeccion dinamica es **`#arbol-body`** (patron anti-regresion de ADR-043 / BUG-066).
- **Evidencia (ADR-006):** commits `66db2e6` (llamadas retiradas) y `604fa0d` (mi-perfil +7/-362); `mi-perfil.html` `#arbol-body` L866, `arbolPintar`/`cargarArbolClases` L3367/L3381 usan `getElementById('arbol-body')`; grep `pf-clase`/`pf-vocaciones-grid`/`renderTablaSVG`/`senderos` = 0 relevantes.
- **Relacion con bugs:** reusa la prevencion de **BUG-066** (ver nota de re-confirmacion en BUGS_HISTORICOS.md); el QA runtime se ejecuto por el riesgo de anidacion (modo express lo exige).
- **Fuera de alcance:** no se toca el backend de Clases (ADR-038), que sigue vigente como dato aunque su UI se integre.

### TSK-128: "Mi Viaje" -> modulo `mymapa.js` en Comunidad + retiro de la seccion del `index.html` [COMPLETADA]

- **Estado:** COMPLETADA (commit `68e50a4` "mymapa", 2026-09-18/19). Verificado contra archivo real (ADR-006).
- **Prioridad:** Alta (nuevo modulo compartido; retira codigo muerto/duplicado del home).
- **Fecha:** 2026-09-18/19
- **Origen:** pedido del usuario de mover los mapas personalizados del home a la Comunidad y reutilizarlos.
- **Responsable / agentes:** frontend-tpl/js-silo-dev (`mymapa.js`, `comunidad.html`, `index.html`), docs-keeper (esta entrada).
- **Detalle:** NUEVO `mymapa.js` (IIFE, ASCII-safe, sin backticks) expone `window.MyMap` (init/crear/editar mapas personales sobre Leaflet); el tab **Mapa** de `comunidad.html` lo integra (`#mm-personal-pills`, `#mm-personal-editbar`, `#mm-personal-map`, `#mm-personal-list`; `onTabMapaAV` -> `MyMap.init`); `index.html` elimina la seccion `#mymapa-section` (-265 lineas) y **~93 archivos HTML** repuntan sus anclas `index.html#mymapa-section` -> `mi-perfil.html`. Se conservan como backups con el ancla (Regla de Oro 3): `index_pre_full.html` y `_lacandelaria3_body.html`.
- **Evidencia (ADR-006):** commit `68e50a4` (95 archivos: `mymapa.js` nuevo +486, `comunidad.html` +50, `index.html` -265, `mi-perfil.html`, `galeria.html` y ~90 paginas .html con el ancla); `git grep -l mymapa-section 68e50a4^ -- *.html` = 95 y `... 68e50a4 -- *.html` = 2 (los backups); `mymapa.js` L18 IIFE, `window.MyMap`; `comunidad.html` script `mymapa.js` L544, `onTabMapaAV` L2063-2067.
- **Relacion con bugs:** ninguno propio; la deuda de JS muerto `mm*` y de anclas en backups queda registrada en NEXT.md como `[DEUDA-EXPRESS]`.
- **Pendiente operativo:** deploy del frontend (el home deja de ofrecer el ancla vieja).

### TSK-129: Visibilidad/dedup de media (video de la cuenta `gonzalezjavierbta`) + diagnostico y cleanup [COMPLETADA]

- **Estado:** COMPLETADA en codigo (commit `dfde7e7` "media", 2026-09-19; **ultimo commit local sin push**, `main` ahead 1 de `origin/main`). Remediacion de datos PENDIENTE en Neon.
- **Prioridad:** Alta (reporte directo: videos subidos que no aparecen en el mapa cultural y reintento bloqueado por 23505).
- **Fecha:** 2026-09-18/19
- **Origen:** reporte del usuario de que la media de la cuenta `gonzalezjavierbta@gmail.com` no aparecia y al re-subir chocaba con "Registro duplicado".
- **Responsable / agentes:** backend-dev (`api/interacciones.js`), sql-security (cleanup 003 + diagnosticos read-only), docs-keeper (esta entrada).
- **Detalle (backend, header v23 sin bump):**
  1. `POST ?tipo=museo_recurso` (crear) captura `23505` del indice unico `idx_album_fotos_dedup` y hace reintento idempotente: si la fila existente estaba oculta/inactiva la reactiva y publica (`activo=true, visible=true`) sin re-otorgar XP; si ya era publica responde 409. Antes el alta fallaba y la fila quedaba invisible.
  2. `POST ?tipo=album_agregar_foto` escribe `visible` explicito con default **true** (`aBooleano(body.visible)`; `null` -> true) y su dedup es republicable (reactiva la fila oculta SIN re-otorgar XP); el INSERT incluye la columna `visible` (cierra el patron de BUG-065 por esa via).
- **Detalle (diagnostico/remediacion, NUEVOS):** `scripts/diagnose_media_oculta.js` (read-only, 344 lineas), `db/cleanups/003_publicar_media_oculta.sql` (idempotente, 140 lineas, no borra filas), `scripts/diagnose_video_mapa.js` (read-only, sin versionar) y `scripts/smoke_036_media_unificada.js` con la asercion **J21** ampliada (ventana 900 -> 2400 para `mi_feed_fotos`).
- **Evidencia (ADR-006):** `api/interacciones.js` `museo_recurso` reintento 23505 L6506-6529; `album_agregar_foto` `afVisible` default true L6744-6745, dedup L6749-6758, INSERT con `visible` L6763; `smoke_036_media_unificada.js` J21 L374-375 (2400).
- **Relacion con bugs:** registra **BUG-068** (dedup 23505 bloqueante de recursos ocultos) y reconoce **BUG-065** (INSERT legacy sin `visible`) como causa hermana; `db/cleanups/003` complementa `db/cleanups/002`.
- **Pendiente operativo (BLOQUEANTE de dato):** correr `scripts/diagnose_media_oculta.js` y `scripts/diagnose_video_mapa.js` con `DATABASE_URL` y aplicar `db/cleanups/003_publicar_media_oculta.sql` en Neon; pushear `dfde7e7` y desplegar `api/interacciones.js`.

### TSK-130: Fix de starvation del mapa cultural (`multimedia_mapa` con LIMIT por rama) [IMPLEMENTADO EN WORKING TREE]

- **Estado:** IMPLEMENTADO EN WORKING TREE (2026-09-19, **SIN commitear**). Verificado contra archivo real (ADR-006).
- **Prioridad:** Alta (la media de usuarios no aparecia en el mapa cultural por el LIMIT compartido del UNION ALL).
- **Fecha:** 2026-09-19
- **Origen:** hallazgo al investigar la media perdida de TSK-129.
- **Responsable / agentes:** backend-dev (`api/interacciones.js`), docs-keeper (esta entrada).
- **Detalle:** la rama `?tipo=multimedia_mapa` aplicaba un unico `ORDER BY votos DESC LIMIT 200` al final del `UNION ALL`, de modo que las filas de mayor voto de la rama global/album desplazaban a la media de usuarios (starvation). Ahora cada rama lleva su propio tope interno (`ORDER BY votos DESC LIMIT 300` en album e `LIMIT 300` en destinos) y el UNION ALL cierra con `ORDER BY votos DESC LIMIT 600`. Header **v23 sin bump** (cambio aditivo).
- **Evidencia (ADR-006):** `api/interacciones.js` L4757 (`ORDER BY votos DESC LIMIT 300) UNION ALL (`) y L4770 (`ORDER BY votos DESC LIMIT 300) ORDER BY votos DESC LIMIT 600`); `git diff` sin commitear.
- **Relacion con bugs:** registra **BUG-069** (starvation por LIMIT compartido, CORREGIDO en working tree).
- **Pendiente operativo:** deploy de `api/interacciones.js` tras pushear.

### TSK-131: Fix del conteo de votos de fotos de viajero en la ficha de destino (store legacy -> `media_votos`) [IMPLEMENTADO EN WORKING TREE]

- **Estado:** IMPLEMENTADO EN WORKING TREE (2026-09-19, **SIN commitear**). Verificado contra archivo real (ADR-006).
- **Prioridad:** Alta (los votos de las fotos de viajero en la ficha mostraban un conteo desactualizado/incorrecto).
- **Fecha:** 2026-09-19
- **Origen:** parte del fix de media de la sesion (la ficha aun leia el store legacy).
- **Responsable / agentes:** backend-dev (`api/pagina-destino.js`), docs-keeper (esta entrada).
- **Detalle:** `api/pagina-destino.js` calculaba `votos` de fotos de viajero contando `interacciones` con `dims->>'voto_foto_id'` (store legacy). Se migra al canonico `media_votos` con `fuente='viajero_foto' AND activo=true AND item_id = i.id::text`, coherente con la media unificada de ADR-036 y con `galeria_destino`.
- **Evidencia (ADR-006):** `api/pagina-destino.js` L2655-2666 (subquery `FROM media_votos mv WHERE mv.fuente='viajero_foto'`); `git diff` sin commitear (header sin bump: sigue `v12.20260917`).
- **Relacion con bugs:** registra **BUG-070** (votos de viajero con store legacy, CORREGIDO en working tree).
- **Pendiente operativo:** deploy de `api/pagina-destino.js`; backfill de votos legacy si aparecen registros historicos (ver `[DEUDA-EXPRESS]` en NEXT.md).

### TSK-132: Adopcion del "Modo Express" como practica operativa + skill `express-mode` [COMPLETADA]

- **Estado:** COMPLETADA (working tree, 2026-09-19, **SIN commitear**). Verificado contra archivo real (ADR-006).
- **Prioridad:** Media (proceso: agiliza sesiones de cambio funcional manteniendo controles proporcionales).
- **Fecha:** 2026-09-18/19
- **Origen:** pedido del usuario de trabajar "express/xpress/rapido" y dejarlo gobernado.
- **Responsable / agentes:** docs-keeper/plan (skill, AGENTS.md y manual), qa-auditor (revision de riesgos), docs-keeper (esta entrada).
- **Detalle:** NUEVA skill `.opencode/skills/express-mode/SKILL.md` (briefs quirurgicos por dominio, verificacion local de 6 puntos, documentacion diferida al cierre y escalado obligatorio a modo normal en arquitectura/seguridad/migraciones/refactors/alcance > 3 archivos criticos o > 10 totales); NUEVOS manual `exploraco desarrollo/ampliacion desarrollo/MODO_EXPRESS_ANALISIS.md` (v1.0, 2026-09-19) y copia de registro `SKILL_MODO_EXPRESS.md`; NUEVO `scripts/express_check.js` (un comando para `node --check` + ASCII-safety de `api/*.js`/`scripts/*.js` y balance de divs de los HTML clave). MODIFICADOS: `agents.md` (directriz Modo Express), `GUIA_DE_DESARROLLO.md` (Apendice B: fila del skill) y `orquestacion agentes.md` (Skill 4 transversal). Cero cambios en la app.
- **Evidencia (ADR-006):** `.opencode/skills/express-mode/SKILL.md` (85 lineas); `MODO_EXPRESS_ANALISIS.md` (13603 bytes); `SKILL_MODO_EXPRESS.md` (4880 bytes); `scripts/express_check.js`; `git diff` de `agents.md`/`GUIA_DE_DESARROLLO.md`/`orquestacion agentes.md`.
- **Relacion con bugs:** los riesgos observados en la sesion (anidacion de contenedores, regresion no detectable por checks estaticos) quedan documentados en `MODO_EXPRESS_ANALISIS.md` seccion D y enlazados a **BUG-066**.
- **Decision:** se registra como NOTA DE PRACTICA OPERATIVA (no ADR) en DECISIONS.md; el detalle vive en `MODO_EXPRESS_ANALISIS.md`.
- **Fuera de alcance:** no se crean endpoints ni migraciones; el presupuesto sigue 8/8 (ADR-010).

## Prioridad MAPA CULTURAL COMPARTIDO - 2026-09-19 (ADR-045)

> Feature "Mis mapas personales (comunidad) con paridad al mapa cultural del index".
> Origen: pedido directo del usuario. Numeracion: el ultimo TSK real antes de esta
> entrega es **TSK-132** (verificado, ADR-006); las tareas nuevas van
> **TSK-133..TSK-135**. NO crea funciones serverless (8/8, ADR-001/ADR-010) ni
> migraciones: son assets frontend de la raiz.

### TSK-133: Motor compartido del Mapa Cultural (`mapa-cultural.js`/`.css`) y paridad del mapa de Comunidad [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-19; commiteada en `b4ffd4e` "maps" - ver la nota de actualizacion TSK-134 mas abajo). Verificado contra archivo real (ADR-006).
- **Prioridad:** Alta (paridad de producto del mapa de Comunidad con el mapa cultural del index).
- **Fecha:** 2026-09-19
- **Origen:** pedido del usuario de "Mis mapas personales (comunidad) con paridad al mapa cultural del index".
- **ADR:** DECISIONS.md **ADR-045** (motor compartido multi-instancia, patron anti-duplicidad).
- **Responsable / agentes:** frontend-tpl/js-silo-dev (`mapa-cultural.js`, `mapa-cultural.css`, `mymapa.js`, `comunidad.html`), qa-auditor (Escudo GOLD/QA), docs-keeper (esta entrada).
- **Precedencia:** continua a TSK-128 (`mymapa.js`) y reutiliza el patron anti-duplicidad de ADR-044 y TSK-117. NO crea archivos en `api/` (presupuesto **8/8 INTACTO**, ADR-001/ADR-010); SI crea assets frontend (no cuentan contra las funciones serverless).
- **Detalle - motor compartido:** NUEVO `mapa-cultural.js` (raiz, IIFE ASCII-safe, sin backticks, 65282 bytes) expone `window.MapaCultural` (L1597) con API multi-instancia `create(opts)`/`init(opts)` + `setPlaces`/`setMedia`/`setMediaEnabled`/`setMediaTypes`/`refresh`/`getMap`/`openDrawer`/`closeDrawer`/`destroy` y helpers `esc`/`starHtml`/`photoPlaceholderHTML`/`haversineKm`. Motor: pines por categoria (`divIcon`/color), clustering por proximidad de 40 px, drawer completo (hero, badge, rating, precio, lead, tabs multimedia, "Ver lugar completo"), capa de media (iconos, bounds, tope 300, dedupe) y lightbox/album. Normalizacion unica `normalizePlace`/`normalizeMedia` (`cat = categoria_slug || cat`; `uuid = _uuid || destino_id`; rating por defecto 0; descarta lat/lng no finitos).
- **Detalle - CSS:** NUEVO `mapa-cultural.css` (raiz, 16112 bytes): 121 reglas extraidas 1:1 del CSS del mapa del index, todas scopadas bajo `.mc-root`, 0 `!important` reales (ADR-004); `<link>` agregado en `comunidad.html` (L14).
- **Detalle - paridad:** tiles CARTO Voyager + clustering por proximidad de 40 px + drawer completo al clic en pin, identico al mapa cultural del index.
- **Detalle - capa de media (decision de producto):** SOLO items de los destinos del mapa activo; match estricto por slug para `origen='destino'`/`'destino_album'`; `origen='album'` SIEMPRE excluido (no tiene vinculo a destino). Una sola peticion cacheada a `/api/interacciones?tipo=multimedia_mapa`, filtrada en cliente al mapa activo; sin cambios de backend. Toggle `.mmx-media`/`.mmx-mbtn` encendido por defecto si el mapa activo tiene media.
- **Detalle - `mymapa.js` (MODIFICADO, +154/-46):** elimina su Leaflet propio y `bindPopup`; consume `MapaCultural.create` (L125); el clic en pin abre el drawer completo y agrega la capa de media con toggle (`comunidad.html` estilos del toggle en su `<style>`).
- **Detalle - `comunidad.html` (MODIFICADO, +17/-0):** `<link rel="stylesheet" href="mapa-cultural.css">` (L14) y `<script src="mapa-cultural.js">` (L559) ANTES de `<script src="mymapa.js">` (L561).
- **Decision de aplazamiento:** la migracion de `index.html` a `mapa-cultural.js` se DIFIERE a una entrega posterior CONTROLADA (no arriesgar el mapa del index); el header del modulo deja la nota anotada. Registrada como TSK-134 (EJECUTADA mas tarde; ver abajo).
- **Evidencia / Escudo GOLD (verificado en esta sesion):** `node --check` OK (`mapa-cultural.js`, `mymapa.js`); ASCII-safe 0 bytes >127 en los 3 archivos nuevos; balance de divs de `comunidad.html` 319/319; llaves CSS 121/121; 0 `!important` reales; CSS 100% scopado bajo `.mc-root`; `scripts/smoke_mapa_cultural.js` **56/56 PASS** (`node scripts/smoke_mapa_cultural.js`); integracion Node vm 23/23 PASS (reportada por QA); `index.html`/`api/*` intactos (diff vacio) AL CIERRE DE TSK-133. Veredicto QA: **APTO CON OBSERVACIONES**. Sin reincidencia de BUG-020/066/067/017-019/002.
- **[Actualizacion TSK-134, 2026-09-19]:** la migracion diferida se EJECUTO. Los assets y la doc de TSK-133 fueron commiteados en `b4ffd4e` ("maps", 11 archivos: `mapa-cultural.js`, `mapa-cultural.css`, `mymapa.js`, `comunidad.html`, `scripts/smoke_mapa_cultural.js` + 6 docs); sobre ese HEAD, TSK-134 trabaja en working tree. TSK-133 NO quedo "SIN commitear" pese a lo que decian los docs de cierre.
- **Relacion con bugs:** MITIGA (no cierra) **BUG-061**: `mapa-cultural.js` extrajo `jsonAuthHeaders()` (L1354) y ahora `guardarMedia` (L1361) y `votarMedia` (L1378) envian `Authorization`, reduciendo el punto de amplificacion; el backend de `guardar_media`/`tipo='foto'` sigue ABIERTO (escalado a `sql-security`). Ver nota de amplificacion en `BUGS_HISTORICOS.md` BUG-061. BUG-002/BUG-062/BUG-065 siguen ABIERTOS y ajenos.
- **Pendiente operativo:** QA visual en navegador del tab Mapa de `comunidad.html` (drawer, toggle de media, lightbox); validar el shape real de `?tipo=mapa` contra Neon; deploy de los assets frontend (`mapa-cultural.js`/`mapa-cultural.css` + `mymapa.js`/`comunidad.html`); commit + push.
- **Archivos al cierre de TSK-133 (working tree, hoy commiteados en `b4ffd4e`):** `mapa-cultural.js` (NUEVO), `mapa-cultural.css` (NUEVO), `scripts/smoke_mapa_cultural.js` (NUEVO); `mymapa.js` (M), `comunidad.html` (M).
- **Fuera de alcance:** migracion de `index.html` (TSK-134); `api/*` e `index-api-connector.js`; autenticacion del backend de BUG-061.

### TSK-134: Migracion de `index.html` a `mapa-cultural.js` (motor compartido) [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-19; **COMMITEADA en `61392c0` "mapa"**, que incluye la migracion del index y la actualizacion de docs. Verificado contra archivo real (ADR-006) el 2026-09-19: `git log --oneline` muestra `61392c0` con `index.html` -1240 lineas). Continua a TSK-133.
- **[Actualizacion cierre documental, 2026-09-19]:** los docs previos (esta entrada y ADR-045) decian "working tree, SIN commitear"; contra archivo real el commit `61392c0` SI contiene la migracion de `index.html` al motor compartido. `main` esta limpio y a la par de `origin/main` en `3ffd7a9`. La QA visual del index sigue PENDIENTE (TSK-135).
- **Prioridad:** Media (elimina el doble motor y unifica el contrato de datos del mapa).
- **Fecha:** 2026-09-19 (ejecutada el mismo dia que TSK-133).
- **Origen:** consecuencia directa de TSK-133/ADR-045: el modulo se creo reutilizable, pero `index.html` seguia usando su mapa cultural inline.
- **ADR:** DECISIONS.md **ADR-045** (se corrige su estado/impacto: el index queda MIGRADO, ver la enmienda de TSK-134 en el ADR).
- **Responsable / agentes:** renderer-dev/frontend-tpl/js-silo-dev (`index.html`, `mapa-cultural.js`, `scripts/smoke_mapa_cultural.js`), qa-auditor (Escudo GOLD + QA), docs-keeper (esta entrada).
- **Precedencia:** TSK-133 fue COMMITTEADA en `b4ffd4e` ("maps"); TSK-134 modifica en working tree `index.html`, `mapa-cultural.js` y `scripts/smoke_mapa_cultural.js`. NO toca `api/*` ni `index-api-connector.js` (presupuesto **8/8 INTACTO**, ADR-001/ADR-010); sin migraciones nuevas.
- **Alcance REAL ejecutado (no el plan original):**
  1. **`index.html` - retiro del motor inline:** se ELIMINO el motor Leaflet inline (~1190 lineas, bloque 2256-3445) y el estado muerto asociado (12 variables tipo `mapaMarkers`/`mapaActiveCat`/`mapaClusterIcon`... mas `mapaGeoRequested`).
  2. **`index.html` - shims hacia el modulo:** se AGREGARON `initMapaSection` (con retry si `!mcMapa.getMap()`), `refreshMapaMarkers` (sin recursion), `geolocateMapa`, `resetMapaColombia`, `closeMapaDrawer`, `openMapaDrawer`, el objeto `INDEX_MC_OPTS` (L2254) y `var mcMapa` (L2252), mas el bloque de carga lazy (IntersectionObserver / scroll / timeout 2 s) que llama a los shims.
  3. **`index.html` - se CONSERVARON:** `esc`, `photoPlaceholderHTML`, `starHtml`, `toggleMapaSave`, `renderMyMap`, el "Mi Mapa" legacy, `MAPA_PLACES` (const), `MAPA_MEDIA` (var) y `mapaMap` (var, seteado en `onMapReady`). Se quitaron los 4 `onclick` de los botones `[data-media]` (los engancha el modulo via `mediaControls`). Se agrego `<script src="mapa-cultural.js">` en el `<head>` (L882) ANTES del inline y del connector. **NO** se agrego `mapa-cultural.css` a `index.html`: se conserva el CSS inline a proposito para paridad visual (0 referencias a `mapa-cultural.css`).
  4. **`mapa-cultural.js` - bump a v1.1.0:** opciones nuevas con default = comportamiento COMUNIDAD: `enableMediaOnAll` (default false), `mediaEnabled` (estado inicial), `mediaFilter` (null = filtro estricto; `false` = capa SIN filtro), `mediaPhotoIcon`, `clusterLinksNavigate`, `mediaControls`, `bindList` y los ganchos `data-comments-*`. El index usa `enableMediaOnAll:true`, `mediaEnabled:false`, `mediaFilter:false`, `mediaPhotoIcon` = U+1F4F8 (camara) y `clusterLinksNavigate:true` (`INDEX_MC_OPTS`, L2266-2270).
- **Evidencia / Escudo GOLD (QA APTO CON OBSERVACIONES, sin bloqueantes):** `git diff --numstat` real = `index.html` +79/-1152, `mapa-cultural.js` +80/-20, `scripts/smoke_mapa_cultural.js` +13/-1; balance de divs de `index.html` **370/370**; sintaxis del `<script>` inline PASS; ASCII delta neto **-224** (no introduce bytes >127 nuevos; `index.html` no es `api/*.js`); 0 referencias colgadas; 0 duplicados de shims/helpers; contrato del connector OK (`window.mapaMap` truthy, `MapaCultural.getMap() === window.mapaMap`, `setMapaMediaSoloMio`/`cargarAlbumOficialDestino` intactos); integracion Node vm PASS. Paridad de comportamiento confirmada en: estado inicial de media, boton "Todo" activa media, deseleccion 'off', enlaces de cluster navegan, filtro de capa = toda `MAPA_MEDIA`, icono camara, album oficial, comentarios y guardar/votar por delegacion.
- **Smoke:** `node scripts/smoke_mapa_cultural.js` = **58/58 PASS** (eran 56; +2 checks de index-compat: `mediaFilter:false` = capa SIN filtro vs default estricto) -> `SMOKE MAPA CULTURAL: OK`.
- **Diferencias aceptadas (deuda cosmetica/UX menor, NO regresiones):** notas de geolocalizacion en ASCII sin tildes (ADR-002) y perdida del estado transitorio "Buscando..." del boton "Cerca de mi"; mas el escape de texto en popup/lista (endurecimiento) y `guardarMedia` con `Authorization` (mitiga BUG-061).
- **Relacion con bugs:** MITIGA (no cierra) **BUG-061**: el motor migrado conserva `jsonAuthHeaders()` y `guardarMedia`/`votarMedia` envian `Authorization`; ahora tambien en el mapa del index. El backend de `guardar_media`/`tipo='foto'` SIGUE ABIERTO (escalado a `sql-security`). Ver nota en `BUGS_HISTORICOS.md` BUG-061.
- **Pendiente operativo:** QA visual en navegador (no cubrible sin navegador; ver TSK-135); validar el shape real de `?tipo=mapa` contra Neon; commit + push + deploy del release (assets frontend, sin migracion ni backend).
- **Dependencia:** TSK-133 (COMPLETADA).

### TSK-135: QA visual en navegador del mapa cultural migrado (`index.html` + `comunidad.html`) [PENDIENTE]

- **Estado:** PENDIENTE (no cubrible sin navegador; el smoke es Node vm con mock).
- **Prioridad:** Media (cierre visual de TSK-133/TSK-134 antes del deploy).
- **Fecha:** 2026-09-19.
- **Origen:** TSK-134 dejo constancia de QA visual pendiente; el smoke Node vm NO valida render real.
- **Alcance:** validar en navegador real sobre `index.html` migrado: clustering de 40 px, popup de cluster, `flyTo`/`bounds`, lightbox/album, posible coexistencia del CSS `.md-*` inline con el modulo scopado bajo `.mc-root` y el doble handler de cierre (inofensivo). Validar tambien el tab Mapa de `comunidad.html` (drawer al clic en pin, toggle de media, lightbox) heredado de TSK-133.
- **Dependencia:** TSK-133 y TSK-134 (COMPLETADAS).
- **Fuera de alcance:** corregir codigo (si aparece una regresion, registrar BUG y abrir tarea nueva).

## Prioridad GALERIA / MAPA CULTURAL / MIS MAPAS / MEDIA - 2026-09-19 (ADR-046 + ADR-047)

> Sesion de correccion de galeria/hero por votos, filtros y media de "Mis mapas
> personales", guardados de media (bug critico) y propiedad de medios del mapa
> cultural. Origen: pedido directo del usuario sobre la comunidad, el index y la
> ficha de destino. Numeracion: el ultimo TSK real antes de esta entrega es
> **TSK-135** (verificado, ADR-006, PENDIENTE de QA visual); las tareas nuevas van
> **TSK-136..TSK-140**. NO crea funciones serverless (8/8, ADR-001/ADR-010) ni
> migraciones: son cambios de frontend/assets y ramas/filtros aditivos de endpoints
> existentes.

### TSK-136: Galeria y hero por votos (ADR-036) -- contrato final del hero [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-19; commits `41a3f71` "destinos", `3ffd7a9` "fotos hero" y parte de `6c84f9d` "videos"). Verificado contra archivo real (ADR-006).
- **Prioridad:** Alta (regla de producto visible: composicion del hero y orden de la galeria).
- **Fecha:** 2026-09-19
- **Origen:** pedido del usuario de que la galeria y el hero se ordenen por votos de la comunidad y de las curadas (ADR-036).
- **ADR:** DECISIONS.md **ADR-046** (contrato del hero, derivado del incidente **BUG-077**).
- **Responsable / agentes:** renderer-dev/frontend-tpl (`api/pagina-destino.js`, `galeria.html`), backend-dev (`api/interacciones.js`), qa-auditor (smokes), docs-keeper (esta entrada).
- **Alcance REAL ejecutado (no el plan original):**
  1. **Ranking unico por votos (commit `41a3f71`):** `api/pagina-destino.js` calcula UNA sola vez `mediaRank` (curadas `galAll` + comunidad `comunidadMerge`, dedupe por URL, `votos` DESC y empate por orden de insercion) y lo comparten hero y galeria. Primera iteracion: si la foto con mas votos tenia `votos > 0`, pasaba a ser imagen principal.
  2. **Contrato FINAL del hero (commit `3ffd7a9`):** la imagen PRINCIPAL es la **seleccion editorial del usuario (`foto_hero`)**: los votos NO la desplazan. Las 3 miniaturas se componen por puntaje: (1) la mejor foto del ESPACIO (curada) por votos y (2-3) las 2 mejores fotos de la COMUNIDAD (viajeros + albumes) por votos; si no hay votos cae al orden de insercion historico. **Los videos/audio nunca entran al hero** (la miniatura es `background-image`). Se anade el campo `fuente` (`espacio|comunidad`) al ranking para separar ambas composiciones.
  3. **`galeria_destino` rankeada (commit `6c84f9d`):** `api/interacciones.js` ordena las curadas por `votos DESC, orden ASC` y expone `items[]` con `votos`; `galeria.html` agrega `gSortVotos()` como orden defensivo (protege si el API degrada) tanto en curadas como en comunidad.
  4. **Orden por votos en `album_oficial`:** `multimedia_mapa` ordena la rama `album_oficial` por `votos DESC, df.es_hero DESC, df.orden ASC`.
- **Evidencia (ADR-006):** `api/pagina-destino.js` L800-872 (`mediaRank`, `mediaRankAdd(...,fuente)`, hero L815-872); `api/interacciones.js` L4471 (`ORDER BY votos DESC LIMIT 100`), L4508 (`ORDER BY votos DESC, f.creado_en DESC LIMIT 60`), L4862 (`album_oficial` por votos); `galeria.html` `gSortVotos`. `git show 3ffd7a9` confirma el cambio de la logica "votos desplazan la principal" -> "principal = seleccion del usuario".
- **Smokes:**
  - `node scripts/smoke_auditoria_pagina_destino.js` = **61 checks, TODOS PASARON** (incluye `hero: exactamente 3 miniaturas`, `hero sin votos: principal = seleccion del usuario`, `hero: video con mas votos NO entra al hero`); verificado 2026-09-19.
  - `node scripts/smoke_036_media_unificada.js` = **90/90 PASS**; verificado 2026-09-19.
- **Relacion con bugs:** abre **BUG-077** (regresion del hero en 2 iteraciones por contrato de producto no fijado). Ver ADR-046.
- **Pendiente operativo:** QA visual en navegador del hero y la galeria en produccion; las modificaciones de `api/pagina-destino.js` e `api/interacciones.js` requieren deploy.
- **Dependencia:** ADR-036 (media unificada).
- **Fuera de alcance:** el store de votos (sigue en `media_votos`, ADR-036); migraciones.

### TSK-137: "Mis mapas personales" -- filtros por categoria, render de media y cache-busting [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-19; commits `600e656` "mapa", `8fe7b47` "mapa" y `e7445c3` "mapa"). Verificado contra archivo real (ADR-006).
- **Prioridad:** Alta (el tab Mapa de la comunidad quedaba inerte o sin media).
- **Fecha:** 2026-09-19
- **Origen:** pedido del usuario de filtros por categoria (hospedaje/comida/lugares/eventos) con opcion de ocultar pines, y correccion de la media que aparecia "activada por defecto" pero no cargaba.
- **ADR:** DECISIONS.md **ADR-045** (motor `mapa-cultural.js`); esta sesion corrige su wiring. No nace ADR nuevo.
- **Responsable / agentes:** frontend-tpl/js-silo-dev (`mymapa.js`, `comunidad.html`), qa-auditor (smoke), docs-keeper (esta entrada).
- **Alcance REAL ejecutado:**
  1. **Barra de categorias (`600e656`):** `comunidad.html` agrega el bloque `.mmx-cats`/`.mmx-cbtn` `id="mm-personal-cats"` con botones `data-cat` (Todo/Hospedaje/Comida/Lugares/Eventos) y CSS; `mymapa.js` lo pasa al motor y lo oculta/muestra en `renderGuest()`.
  2. **Selector como elemento DOM (`8fe7b47`):** `ensureMC()` pasa `categories: document.getElementById('mm-personal-cats')` (no un string de selector) para no depender del parseo; el motor engancha `[data-cat]` y permite filtrar/ocultar pines.
  3. **Media que no pintaba al abrir (`8fe7b47`):** `invalidateSize()` + `fitBounds()` + `refresh()` en `onMapReady` e `invalidarTamano()`; se fuerza `setMediaEnabled(true)` cuando hay media para el mapa activo (antes quedaba "marcada pero vacia").
  4. **Cache-busting:** `mapa-cultural.js?v=3` (commit `e7445c3`, en `comunidad.html` e `index.html`), `mapa-cultural.js?v=4` (commit `3ffd7a9`, en ambos) y `mymapa.js?v=3` (commit `8fe7b47`, en `comunidad.html`). Al cierre: `comunidad.html` L566/L568 e `index.html` L882.
- **Evidencia (ADR-006):** `mymapa.js` L131-173 (`ensureMC` con `categories` DOM, `onMapReady` con `invalidateSize`+`refresh`, `invalidarTamano` con `fitBounds`), L420-434 (mostrar/ocultar `#mm-personal-cats`); `comunidad.html` L280-293 (CSS `.mmx-cats`) y L469 (`id="mm-personal-cats"` con `data-cat`); `comunidad.html` L566/L568 e `index.html` L882 (cache-bust).
- **Smoke:** `node scripts/smoke_mapa_cultural.js` = **73 checks, 0 FAIL** (`SMOKE MAPA CULTURAL: OK`); verificado 2026-09-19. Cubre `bindCategories` (click `data-cat` -> `activeCat`, re-click -> `off`) y la guarda del selector sin `#`.
- **Relacion con bugs:** abre **BUG-072** (filtros inertes por wiring), **BUG-073** (cache del navegador) y **BUG-074** (media no pintaba al abrir).
- **Pendiente operativo:** QA visual en navegador (drawer/toggle/lightbox); deploy de los assets frontend.
- **Dependencia:** TSK-133 (motor compartido).
- **Fuera de alcance:** `api/*` (no se toco en esta tarea); esquema.

### TSK-138: Guardados de media en "Mis mapas" -- bug critico de `mis_guardados_media` + pines de guardados [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-19; commit `6c84f9d` "videos"). Verificado contra archivo real (ADR-006).
- **Prioridad:** Alta (endpoint siempre vacio: los guardados de media no aparecian en ningun lado).
- **Fecha:** 2026-09-19
- **Origen:** bug critico reportado: los guardados de media no se pintaban en el mapa personal.
- **ADR:** DECISIONS.md **ADR-036** (media unificada) + **ADR-032** (guardados); no nace ADR nuevo. Regla de no-catch-silencioso (AGENTS.md 2.2).
- **Responsable / agentes:** backend-dev (`api/interacciones.js`), frontend-tpl/js-silo-dev (`mymapa.js`, `galeria.html`), qa-auditor (smoke), docs-keeper (esta entrada).
- **Causa raiz:** `mis_guardados_media` comparaba tipos incompatibles `uuid = text` en 3 joins contra `media_guardados.item_id` (la migracion 023 convirtio `item_id` a TEXT) y el `.catch(function(){ return []; })` silenciaba el error, de modo que el endpoint devolvia `[]` siempre.
- **Alcance REAL ejecutado (commit `6c84f9d`):**
  1. **Casts explicitos `::text`:** los 3 joins pasan a `a.id::text = mg.item_id`, `af.id::text = mg.item_id`, `i.id::text = mg.item_id`.
  2. **Rama `curada`:** se agrega el `UNION ALL` de `media_guardados.fuente='curada'` contra `destinos_fotos` (`df.id::text`).
  3. **No-catch-silencioso:** el `.catch` devuelve `[]` pero ahora registra `console.warn('[interacciones] mis_guardados_media fallo: ...')`.
  4. **Contrato para el frontend:** `multimedia_mapa` expone `media_id` y `fuente` (`album_foto`/`curada`); `mymapa.js` pinta los medios guardados como pines via `filterMisMapa` + `SET_GUARDADOS` (clave `fuente:media_id`) y `cargarGuardados()`.
- **Evidencia (ADR-006):** `api/interacciones.js` L4967-5004 (`mis_guardados_media`: L4976/L4982/L4989 casts `::text`, L4993-4999 rama `curada`, L5002 `console.warn`); L4755 y L4774 (`media_id`/`fuente` en `multimedia_mapa`); `mymapa.js` L179-227 (`claveGuardado`, `filterMisMapa`, `cargarGuardados`). `git show 6c84f9d` confirma el reemplazo de `JOIN ... ON a.id = mg.item_id` por `ON a.id::text = mg.item_id`.
- **Smoke:** `node scripts/smoke_036_media_unificada.js` = **90/90 PASS**; verificado 2026-09-19.
- **Relacion con bugs:** cierra **BUG-071** (joins `uuid = text` + catch silencioso). Depende de que la migracion **023** este aplicada en Neon.
- **Pendiente operativo:** deploy de `api/interacciones.js`; confirmar la migracion 023 en Neon.
- **Dependencia:** ADR-036 / migracion 023.
- **Fuera de alcance:** backfill legacy de guardados.

### TSK-139: Regla de propiedad de medios del mapa cultural -- fotos del espacio, videos/audio de comunidad [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-19; commits `e7445c3` "mapa" y `3ffd7a9` "fotos hero"). Verificado contra archivo real (ADR-006).
- **Prioridad:** Alta (el drawer mostraba fotos de otros lugares; al restringir se ocultaron los videos).
- **Fecha:** 2026-09-19
- **Origen:** reporte del usuario de que al abrir el pin de `hostal-r10-bogota` aparecian fotos de otros lugares (La Candelaria, Monserrate).
- **ADR:** DECISIONS.md **ADR-047** (regla de propiedad de medios).
- **Responsable / agentes:** frontend-tpl/js-silo-dev (`mapa-cultural.js`), qa-auditor (smoke), docs-keeper (esta entrada).
- **Alcance REAL ejecutado:**
  1. **Filtro estricto del drawer (commit `e7445c3`):** `mapa-cultural.js` reemplaza `mediasCercanas()` (ciudad/radio 10 km) por `filterMediaPropios(items, place)`: las FOTOS del drawer son SOLO `origen='destino'`/`'destino_album'` del propio espacio (match por `slug`/`uuid`); las fotos de otros lugares se ocultan aunque esten cerca o en la misma ciudad.
  2. **Se conservan videos/audio de la comunidad (commit `3ffd7a9`):** al restringir la media a `destino`/`destino_album`, desaparecieron los videos (que son `origen='album'`); el fix restaura los VIDEO/AUDIO de comunidad (`origen='album'`) de la misma ciudad o a <= 10 km del espacio, para que la pestana Videos/Audios del drawer no quede vacia. Las fotos de albumes de usuario siguen ocultas.
  3. **Capa general de media sin cambios:** `filterMediaDefault()` mantiene la regla de que la capa del mapa solo muestra `destino`/`destino_album` de los destinos activos y excluye `origen='album'`.
- **Evidencia (ADR-006):** `mapa-cultural.js` L187-200 (`filterMediaDefault`), L202-239 (`filterMediaPropios` con `esVideoAudio`/`cerca`), L1160 (uso en el drawer) y L1708 (exportacion); `git show e7445c3` (introduce `filterMediaPropios`) y `git show 3ffd7a9` (restaura video/audio de comunidad).
- **Smoke:** `node scripts/smoke_mapa_cultural.js` = **73 checks, 0 FAIL**; incluye `filterMediaPropios: incluye video/audio de la ciudad`, `excluye video de otra ciudad lejana` y `foto de album de usuario sigue oculta`; verificado 2026-09-19.
- **Relacion con bugs:** abre **BUG-075** (drawer con fotos de otros lugares) y **BUG-076** (regresion: videos ocultos al restringir). Ver ADR-047.
- **Pendiente operativo:** QA visual en navegador; deploy de `mapa-cultural.js` (cache-bust v4).
- **Dependencia:** TSK-133 (motor compartido).
- **Fuera de alcance:** `api/*`; el shape de `?tipo=mapa` contra Neon (TSK-135).

### TSK-140: Documento de analisis AI-DOS v1.1 / Reglas de Oro v5 (propuestas v1.2 / v6) [COMPLETADA EN DISCO - PENDIENTE DE APROBACION]

- **Estado:** COMPLETADA en disco (archivo NUEVO sin versionar, 2026-09-19); **propuestas PENDIENTES DE APROBACION del operador**. NO se modifico el `.docx` del AI-DOS ni las Reglas de Oro.
- **Prioridad:** Media (gobernanza de proceso; no bloquea codigo).
- **Fecha:** 2026-09-19
- **Origen:** encargo del operador de convertir la experiencia real de la etapa en propuestas concretas para el AI-DOS y las Reglas de Oro.
- **Archivo NUEVO (sin versionar/untracked):** `exploraco desarrollo/ampliacion desarrollo/ANALISIS_AI-DOS_v1.1_y_REGLAS_DE_ORO_v5.md` (285 lineas, 17896 bytes, **0 bytes >127** verificado 2026-09-19).
- **Contenido:** metodo con evidencia E1/E2/E3; tamano de los docs del Core (~1.28 MB, con desglose por archivo); costo real (`informes-cuota/cuota-2026-09-14-dia.md`: docs-keeper pago $0.3743 = 49% del gasto del dia); 8 incidentes reales (I1-I8); diagnostico del AI-DOS v1.1 (brechas G1-G12); diagnostico de las Reglas de Oro v5 (puntos vigentes, obsoletos y reglas faltantes P11-P19); propuestas por capitulo para el AI-DOS v1.2 y texto propuesto para las Reglas de Oro v6.
- **Evidencia (ADR-006):** conteo de bytes sobre el archivo real (0 bytes >127); `informes-cuota/cuota-2026-09-14-dia.md` (docs-keeper 214 invocaciones / $0.3743 sobre $0.7643); tamano real de los docs del Core medido el 2026-09-19 (TASKS 388303 B, DECISIONS 366410 B, NEXT 329054 B, BUGS_HISTORICOS 149863 B, BLUEPRINT 64703 B, PROJECT 39327 B).
- **Relacion con bugs:** su tabla de incidentes I1-I8 es la fuente de los BUG-071..BUG-077 de esta sesion.
- **Pendiente operativo (BLOQUEANTE de proceso):** aprobacion del operador; commit del `.md` y del `.docx` (hoy untracked); aplicar las propuestas a los documentos maestros solo tras aprobacion.
- **Fuera de alcance:** editar `AI-DOS Master Specification v1.1.docx` o `Reglas de Oro ExploraCO - v5.md` (no autorizado).

## Prioridad GEMA GEMINI RESEARCH - 2026-09-20 (cierre express)

> Cierre documental EXPRESS (skill `express-mode`: documentacion diferida en un solo
> pase, sin tocar codigo). La gema es un articulo de configuracion de prompts, NO
> arquitectura del sistema: no nace ADR nuevo y no se toca DECISIONS.md.
> BUGS_HISTORICOS.md tampoco se toca: BUG-034 (drift de `scripts/validate_ficha.js`)
> ya esta registrado y se re-confirma vigente en esta sesion (ADR-006).

### TSK-141: Gema Gemini "ExploraCO Research" -- GEMINI_GEMA_INVESTIGACION.md (investigacion web autogestionada) [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-20, cierre documental express). Verificado contra archivo real (ADR-006).
- **Prioridad:** Media (pipeline de ingesta del skill gemini-research; no bloquea runtime ni deploy).
- **Fecha:** 2026-09-20
- **Origen:** pedido del operador de una gema/instruccion de Gemini que reciba nombre+lugar (destinos, uno a uno) o un lote de N (eventos) y ejecute TODA la investigacion web por su cuenta.
- **Archivo NUEVO (untracked, sin commitear):** `.opencode/skills/gemini-research/prompts/GEMINI_GEMA_INVESTIGACION.md` (**154 lineas**, verificadas 2026-09-20 con `Test-Path` y conteo de lineas).
- **ADR:** no nace ADR nuevo (configuracion de prompts, no decision de arquitectura del sistema).
- **Responsable / agentes:** research-agent-free (autoria de la gema), docs-keeper-free (esta entrada de cierre).
- **Alcance REAL ejecutado (no el plan original si difiere):**
  1. La gema pide al usuario SOLO nombre+lugar (uno a uno para destinos) o una lista de N (lote para eventos) y ejecuta TODA la investigacion web por si misma, usando como archivos adjuntos de referencia los 3 recursos canonicos existentes (`GEMINI_MASTER_PROMPT.md`, `GEMINI_EVENTOS_PROMPT.md`, `ficha_template.md`) SIN duplicar su contenido (Tripwire de 5 lineas cumplido).
  2. Entrega: ficha .md completa segun `ficha_template` + bloque JSON final (esquema de la seccion 6 del master, TAGS por categoria) o array JSON de eventos; con clogs Escudo GOLD (INFO/DEBUG/LINK/TRACE/TIME) y cierre `==FIN==`.
  3. NO edita codigo: los mandatos de edicion (seed/loader/upload) quedan explicitamente FUERA de la gema; los ejecuta el pipeline de ExploraCO downstream.
  4. Validacion downstream: `node .opencode/skills/gemini-research/scripts/validate_ficha.js` (fichas) y `node scripts/validate_eventos.js` (eventos).
- **Hallazgos adicionales (deuda registrada):**
  - **GAP de infraestructura (candidato):** `exp-pickle-free` aparece listado en `AGENTS.md` seccion 1.1 (matriz de routing gratuita) pero NO existe `.opencode/agent/exp-pickle-free.md` (el runtime responde "unknown agent type"). Queda como deuda para crear/revisar el agente. **[DEUDA-EXPRESS]**
  - La gema NO esta referenciada todavia en `.opencode/skills/gemini-research/SKILL.md` (opcional: el operador puede configurar la gema directamente desde su ruta). Es decision del operador si se integra al skill mas adelante. **[DEUDA-EXPRESS]**
- **Evidencia (ADR-006):** archivo real de 154 lineas en la ruta citada (`Test-Path` = True); `validate_ficha.js` confirmado SOLO en `.opencode/skills/gemini-research/scripts/validate_ficha.js` (`scripts/validate_ficha.js` sigue inexistente, BUG-034 vigente); `.opencode/agent/exp-pickle-free.md` confirmado inexistente (`Test-Path` = False; en `.opencode/agent/` solo existe `exp-pickle.md`).
- **Smokes / verificacion:** esta tarea no genero codigo ejecutable; la validacion funcional de la gema (salida vs validador real) queda como QA manual en Gemini, ver NEXT.md "Que sigue".
- **Relacion con bugs:** BUG-034 sigue ABIERTO (drift documental de `scripts/validate_ficha.js`); re-confirmado contra el archivo real en esta sesion.
- **Pendiente operativo:** decidir: (a) probar la gema pegando el `.md` + adjuntando los 3 recursos en Gemini y validando la salida con `validate_ficha.js`/`validate_eventos.js`; (b) si se referencia la gema en `gemini-research/SKILL.md`; (c) crear `.opencode/agent/exp-pickle-free.md`.
- **Dependencia:** recursos canonicos del skill (`GEMINI_MASTER_PROMPT.md`, `GEMINI_EVENTOS_PROMPT.md`, `ficha_template.md`).
- **Fuera de alcance:** editar los prompts canonicos; editar codigo; tocar DECISIONS.md ni BUGS_HISTORICOS.md (sin ADR ni bug nuevo que justifique).

## Prioridad AGENTES HYBRID - 2026-09-20 (ADR-048)

> Tercer grupo de agentes primarios (esquema tripartito de orquestacion: Standard/Pro,
> Free y Hybrid con ruteo por riesgo). NO toca app/runtime/BD: gobernanza de orquestacion
> solamente (`.opencode/agent/*.md`, AGENTS.md, `orquestacion agentes.md` v1.1). La
> decision vive en DECISIONS.md ADR-048 (APROBADO 2026-09-20).

### TSK-HYBRID-001: Tercer grupo de agentes hybrid-plan/hybrid-build (ruteo por riesgo) [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-20, cierre documental). Verificado contra archivo real (ADR-006).
- **Prioridad:** Media (gobernanza de proceso; no bloquea codigo, runtime ni deploy).
- **Fecha:** 2026-09-20
- **Origen:** analisis de consumo real de opencode.db (821 sesiones ago-sep 2026): `build` PRO = 35% del gasto, tareas rutinarias = 23% migrables a la ruta free, criticas = 38% permanecen PRO; `explore` PRO **$2.41 en 146 sesiones** vs `explore-free` **$0.12** para la misma lectura del repo.
- **ADR:** DECISIONS.md **ADR-048** ("Esquema tripartito de orquestacion de agentes -- ruteo por riesgo", APROBADO 2026-09-20).
- **Responsable / agentes:** architect-free (analisis + autoria del ADR-048), docs-keeper-free (matriz en el doc v1.1 + esta entrada de cierre), qa-auditor (auditoria).
- **Alcance REAL ejecutado (no el plan original si difiere):**
  1. **NUEVOS `.opencode/agent/hybrid-plan.md` y `.opencode/agent/hybrid-build.md`** (ambos `model: opencode-go/deepseek-v4.1-flash`, `mode: primary`): `hybrid-plan` con edit/bash **deny** (solo invoca `@explore-free`/`@research-agent-free`; asigna la implementacion por nombre en la tabla del plan para que la ejecute `hybrid-build` en una sesion posterior); `hybrid-build` con edit/bash **allow** (orquestador ejecutor, rutea cada tarea atomica por riesgo y criterio).
  2. **Matriz de ruteo (fuente de verdad = prompt real del agente + AGENTS.md seccion 1.2 + doc v1.1):** PRO = `backend-dev`, `admin-dev`, `renderer-dev`, `frontend-tpl`, `sql-security`, `architect` + `architect-review`; FREE = `explore-free`, `content-loader-free`, `js-silo-dev-free`/`exp-pickle-free`, `data-migration-free`, `seo-dev-free`, `qa-auditor-free`, `docs-keeper-free`, `media-reader-free`, `research-agent-free`/gemini-research.
  3. **DECISIONS.md:** NUEVO **ADR-048** (APROBADO 2026-09-20).
  4. **AGENTS.md:** encabezado "tres rutas completas" + nueva subseccion **1.2 "Ruta HYBRID"**; la seccion de PAGO queda renumerada a 1.3.
  5. **`exploraco desarrollo/ampliacion desarrollo/orquestacion agentes.md`:** actualizado a **v1.1** (matriz hybrid exacta, nota de consumo, filas `hybrid-build`/`hybrid-plan` con el modelo corregido a `deepseek-v4.1-flash`).
  6. **`opencode.json` NO se modifico** (consciente y documentado en ADR-048): `default_agent` sigue en `free-plan`.
- **Evidencia (ADR-006):** archivos reales verificados hoy: `hybrid-build.md` (L2-26: `model: opencode-go/deepseek-v4.1-flash`, `mode: primary`, edit/bash allow, matriz PRO/FREE resumida) y `hybrid-plan.md` (edit deny, solo `@explore-free`/`@research-agent-free`); `opencode.json` L5 `"default_agent": "free-plan"` INTACTO; `AGENTS.md` subseccion 1.2 presente; `orquestacion agentes.md` filas hybrid en `deepseek-v4.1-flash` (L68-69); `.opencode/agent/` con **17/17 agentes citados por la matriz presentes** (incluido `exp-pickle-free.md`, GAP de TSK-141 resuelto).
- **Smokes / verificacion:** QA audit completo: frontmatter YAML valido, campos permitidos, modelo con prefijo valido, `mode: primary`, permisos rol-coherentes, 17/17 agentes citados existen, `default_agent` intacto, duplicidad resuelta (F-1/F-2 corregidos; el unico "run" restante es el bloque `permission` del frontmatter, boilerplate normativo compartido por los 4 primarios -- no constitutivo de duplicidad).
- **Relacion con bugs:** ninguno nuevo; **BUG-034** sigue ABIERTO (ajeno a esta sesion). El GAP de `exp-pickle-free` documentado en TSK-141 quedo resuelto (el archivo existe hoy).
- **Pendiente operativo:** **[DEUDA-EXPRESS]** los parametros de OpenAI-GO (que modelos para hybrid vs free) se decidieron en esta sesion basados en datos de consumo; si el operador quiere cambiar el `default_agent` a `hybrid-build`, es una **sesion separada** de 1 cambio en `opencode.json` + restart.
- **Dependencia:** ADR-048.
- **Fuera de alcance:** `api/*.js`, esquema, BD, presupuesto 8/8; `opencode.json` (0 cambios).

## Prioridad SALTO DEL TEQUENDAMA - 2026-09-20 (cierre express)

> Cierre documental EXPRESS (skill `express-mode`: un solo pase, baja profundidad,
> sin tocar codigo). Publicacion a produccion de la pagina dinamica del destino
> Salto del Tequendama a partir del archivo fuente corrupto `hotel tequendama.txt`.
> No nace ADR nuevo ni bug de ExploraCO (la data corrupta es del archivo fuente y se
> descarto): DECISIONS.md y BUGS_HISTORICOS.md NO se tocaron.

### TSK-142: Pagina dinamica salto-del-tequendama (sitio, Soacha/Cundinamarca) desde hotel tequendama.txt [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-20, cierre documental express). Verificado contra archivo real (ADR-006).
- **Prioridad:** Alta (contenido nuevo en produccion; no bloquea runtime ni deploy pendiente).
- **Fecha:** 2026-09-20
- **Origen:** archivo `hotel tequendama.txt` (ficha JSON a medio generar con data corrupta: lineas 92-119 eran texto de error de Gemini pegado).
- **Slug / destino en produccion:** `salto-del-tequendama` (categoria `sitio`, ciudad Soacha, region Cundinamarca); **id Neon `8c2b48fc-c6c5-4ec4-ad42-909a73911ce0`**, `status=published`. URL viva: https://exploraco.vercel.app/salto-del-tequendama.html
- **Alcance REAL ejecutado (no el plan original si difiere, ADR-006):**
  1. **Ficha saneada** -> `ficha/ficha-salto-del-tequendama.md` (JSON valido, FAQS x5, FOTOS_SUGERIDAS con 5 URLs reales verificadas HEAD 200, FUENTES: casamuseotequendama.org + maps). Nota de ruta: la ficha vive en `ficha/`, no en `exploraco desarrollo/`.
  2. **5 fotos resueltas en Wikimedia Commons** (compliance BUG-022): hero profesional + 4 galeria.
  3. **3 scripts creados** siguiendo patrones existentes: `scripts/seed-salto-del-tequendama.js` (upsert Neon, ON CONFLICT slug, `--dry`), `scripts/load-salto-del-tequendama-api.js` (loader API DELETE+POST, token default), `scripts/smoke_test_salto-del-tequendama.js` (fake_neon + buildHTML).
  4. **Verificacion local (Escudo GOLD):** `node --check` OK x3; ASCII-safety 0 bytes >127; smoke **15/15 PASS**; divs diff=0.
  5. **CARGA A PRODUCCION ejecutada y verificada:** `node scripts/load-salto-del-tequendama-api.js` -> `OK - destino salto-del-tequendama (8c2b48fc-c6c5-4ec4-ad42-909a73911ce0) status=published`. La URL renderiza completa (hero, galeria, entradas, tours, itinerario, FAQ, mapa, JSON-LD TouristAttraction) y `/api/destinos` devuelve el slug con `status=published`.
  6. **Typo del archivo fuente corregido:** "Caoda" -> "Caida" en seed + ficha + clean.json (`hotel tequendama.txt` original se dejo intacto; `hotel tequendama.clean.json` quedo como artifact de respaldo en la raiz).
- **Evidencia (ADR-006):** archivos reales verificados hoy: `ficha/ficha-salto-del-tequendama.md`, `scripts/seed-salto-del-tequendama.js`, `scripts/load-salto-del-tequendama-api.js`, `scripts/smoke_test_salto-del-tequendama.js`, `hotel tequendama.txt` y `hotel tequendama.clean.json` (todos presentes en el repo).
- **Smokes / verificacion:** `smoke_test_salto-del-tequendama.js` **15/15 PASS**; `node --check` 3/3; ASCII-safety 0 bytes >127; divs diff=0.
- **Relacion con bugs:** ninguno nuevo (la data corrupta es del archivo fuente, no de ExploraCO); DECISIONS.md y BUGS_HISTORICOS.md NO se tocaron.
- **Pendiente operativo:** deuda etiquetada `[DEUDA-EXPRESS]` en NEXT.md (horario a revalidar, contacto sin verificar, itinerario de 2 paradas, archivos fuente/artifact en la raiz).
- **Dependencia:** patron seed+loader+smoke validado (TSK-066/068/069/077); compliance BUG-022 en fotos.
- **Fuera de alcance:** tocar codigo del motor; DECISIONS.md ni BUGS_HISTORICOS.md; editar el `.txt` original.

## Prioridad DRAWER MAPA CULTURAL - 2026-09-20 (cierre express / ENMIENDA 1 ADR-047)

> Cierre documental EXPRESS (skill `express-mode`: un solo pase, sin tocar codigo) de la
> eliminacion de la heuristica de cercania del drawer del mapa cultural: la media del
> resumen de un pin queda SOLO con vinculo explicito al lugar. La ENMIENDA 1 del ADR-047
> (DECISIONS.md, escrita por architect el 2026-09-20) es la decision de arquitectura;
> esta entrada documenta el alcance real ejecutado. NO crea funciones serverless (8/8,
> ADR-001/ADR-010) ni migraciones.

### TSK-143: Drawer del mapa cultural solo por vinculo explicito (fin de la cercania para video/audio) [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-20, cierre documental express; **working tree, SIN commitear**). Verificado contra archivo real (ADR-006).
- **Prioridad:** Alta (fallo global de producto: media ajena adjuntada a cualquier pin de la ciudad).
- **Fecha:** 2026-09-20
- **Origen:** el drawer/resumen de un pin seguia mostrando VIDEO/AUDIO de comunidad (`origen='album'`) por heuristica de cercania (misma ciudad o <= 10 km), concesion heredada de la mitigacion de BUG-076 (`3ffd7a9`); al abrir `hostal-r10-bogota` aparecian TODOS los videos/audios de Bogota. Decision de producto del operador: pertenencia SIEMPRE por vinculo explicito, para todos los media types.
- **ADR:** DECISIONS.md **ADR-047 + ENMIENDA 1 (2026-09-20)** (escrita por architect; esta entrada NO la modifica). La enmienda reclasifica/revierte explicitamente la mitigacion de **BUG-076**.
- **Responsable / agentes:** frontend-tpl/js-silo-dev (`mapa-cultural.js`, `index.html`, `comunidad.html`), qa-auditor (Escudo GOLD + smoke), docs-keeper-free (esta entrada de cierre).
- **Alcance REAL ejecutado (no el plan original si difiere):**
  1. **`filterMediaPropios` simplificada en `mapa-cultural.js` (aprox. L202-230):** se eliminan `ciudad`/`lat`/`lng`/`esVideoAudio`/`cerca`/`haversineKm <= 10`; el drawer muestra SOLO media con vinculo explicito (`origen='destino'`/`'destino_album'` y `origen_id === slug|uuid` del lugar), para FOTOS, VIDEOS y AUDIOS. Dedupe por URL conservado.
  2. **Comentarios actualizados (ADR-006):** bloque L202-208 y el de `mediasCercanas` (aprox. L1143-1149) explican que la cercania se descarto. `haversineKm` sigue viva (L106 definicion; uso en orden por distancia al geolocalizar).
  3. **La CAPA del mapa NO cambia:** `filterMediaDefault` (`mapa-cultural.js` L190-203) conserva su regla estricta (solo `origen='destino'`/`'destino_album'`; `origen='album'` excluido SIEMPRE; el backend emite video/audio solo en la rama `origen='album'`). Los pines de video/audio del index provienen de su `mediaFilter` propio (`index.html` L2274-2280) y de `filterMisMapa` (`mymapa.js` L189); en `comunidad.html` no se muestran salvo media guardada (coherente con el pendiente operativo: video/audio de comunidad no guardado no aparece ni en la capa ni en el drawer).
  4. **Cache-busting:** `mapa-cultural.js?v=4` -> `?v=5` en `index.html` (L882) y `comunidad.html` (L566).
  5. **Smoke actualizado:** check de `scripts/smoke_mapa_cultural.js` L272 invertido a `'filterMediaPropios: excluye video/audio de comunidad (misma ciudad)'`.
- **Evidencia (ADR-006):** `mapa-cultural.js` L202-230 (`filterMediaPropios` sin heuristica), L106 (`haversineKm`), L1143-1149 (`mediasCercanas` como envoltorio del filtro puro); `index.html` L882 y `comunidad.html` L566 (`?v=5`); `scripts/smoke_mapa_cultural.js` L272/L273/L274 (checks de exclusion) y cierre `SMOKE MAPA CULTURAL: OK`. Ademas, (a) el docstring de cabecera de `mapa-cultural.js` fue corregido por ESTE mismo cambio: listado de exports L17-18 agrega `filterMediaPropios` a los extras de apoyo a pruebas y el docstring L29-32 reescribe la opcion `mediaFilter` (la seccion multimedia del drawer usa `st.media` filtrada por `filterMediaPropios`, sin cercania), verificado en `git diff -- mapa-cultural.js`; (b) la ENMIENDA 1 del ADR-047 fue revisada y APROBADA por architect-review (2026-09-20, DECISIONS.md).
- **Smokes / verificacion:** `node scripts/smoke_mapa_cultural.js` = **73 checks, 0 FAIL** (2026-09-20). Escudo GOLD (qa-auditor): `node --check` OK, ASCII 0 bytes >127, balance de divs diff 0 en `index.html` y `comunidad.html`; veredicto **APTO CON OBSERVACIONES**.
- **Relacion con bugs:** **BUG-076 RECLASIFICADO** (su mitigacion por cercania ELIMINADA; su sintoma = comportamiento de producto aceptado) y **BUG-075** con nota cruzada (sigue CERRADO; pertenencia explicita para todos los media types). Ver BUGS_HISTORICOS.md y la ENMIENDA 1 del ADR-047.
- **Pendiente operativo:** QA visual en navegador del drawer (verificar que el pin de `hostal-r10-bogota` ya no muestra videos/audios ajenos y que las pestanas de un lugar con vinculos propios estan bien); commit/deploy del asset con cache-bust v5; **decision de producto sobre `comunidad.html`**: un video/audio de comunidad NO guardado en el destino ya no aparece ni en la capa ni en el drawer (consecuencia intencional, a validar con producto).
- **Dependencia:** TSK-139/ADR-047 (regla de propiedad previa); ENMIENDA 1 del ADR-047 (decision vigente).
- **Fuera de alcance:** `api/*.js` (8/8 INTACTO; el backend hoy NO emite `media_compartidos` por `?tipo=multimedia_mapa`); la via futura de mostrar video/audio en el drawer via `media_compartidos` (migracion 022: `fuente='album_foto'` + `destino_id`) requeriria cambio de backend; el docstring de cabecera de `mapa-cultural.js` (L31-32 del trabajado previo; corregido por ESTE mismo cambio, ver Evidencia (a)); NO se toco `DECISIONS.md` (la enmienda la escribio architect y fue revisada y aprobada por architect-review el 2026-09-20).

## Prioridad ESTADO PERSISTENTE DEL USUARIO (directorios + ficha + resena con nombre) - 2026-09-20 (cierre express)

> Cierre documental EXPRESS (skill `express-mode`: un solo pase, docs-only, ruta FREE,
> sin tocar codigo) del cambio que deja PERSISTENTE el estado del usuario (guardados +
> visitas) al reingresar en las paginas del directorio y en la ficha de destino, y que
> hace que la resena use el NOMBRE DE LA CUENTA en vez del correo generico
> `nombre@explorador.co`. TODO en working tree, SIN commitear. NO crea funciones
> serverless (**8/8 INTACTO**, ADR-001/ADR-010) ni migraciones; `api/interacciones.js`
> NO se toco (se reusan GET existentes).

### TSK-144: Estado persistente del usuario en directorios + ficha (guardados/visitas) y resena con nombre de cuenta [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-20, cierre documental express; **working tree, SIN commitear**). Verificado contra archivo real (ADR-006).
- **Prioridad:** Alta (UX de producto: los corazones/visitas del usuario se perdian al reingresar; la resena no se atribuia a la cuenta).
- **Fecha:** 2026-09-20
- **Origen:** los directorios hidrataban `mm_saved` (localStorage) con timing previo al refresco de sesion, usaban claves numericas legacy (colision entre destinos) y NUNCA persistian a BD; la ficha no pre-cargaba "estuve aqui"; `publicarResena` creaba `nombre@explorador.co`. BUG registrado: **BUGS_HISTORICOS.md BUG-078 (CERRADO)**.
- **Responsable / agentes:** js-silo-dev/frontend-tpl (`usuario-session.js`, `api/pagina-destino.js`, `index.html`, NUEVO `directorio-session.js`, 5 directorios), qa-auditor (Escudo GOLD + smokes), docs-keeper-free (esta entrada de cierre).
- **Alcance REAL ejecutado (no el plan original si difiere):**
  1. **`usuario-session.js` (+54/-10):** NUEVAS `window.ExploraCO.estaVisitado(uuid)` (~L847-870; reusa GET `?tipo=mapa&usuario_id` -> `data.visitados`; sin sesion = false) y `estadoDestino(uuid)` (~L872-894; `Promise.all([estaGuardado, estaVisitado, obtenerMiVoto])` -> `{guardado, visitado, voto}`); `publicarResena` (~L719-729) AHORA EXIGE SESION: abre modal de login y responde `{ok:false, requiere_login:true}` (ya NO crea `nombre@explorador.co`; el POST se conserva con `usuario_id` real).
  2. **`api/pagina-destino.js`:** `precargarEstado()` idempotente (~L2638-2662) enganchada en `window.onExploraCOUpdate` + respaldo DOMContentLoaded (marca `#btn-guardar`, `#btn-visitado`, pinta `#qr-stars`; corrige la causa raiz de timing de sesion); `#rvn` readonly con `usuario.nombre`; `submitRv` usa el nombre de la cuenta; callback de publicacion corregido a `if(ok===true)` (~L2511).
  3. **`index.html` (~L3535-3540):** `_hidratarGuardadosDB()` ahora llama `renderDest()` con guardados/visitas nuevos (corazones en la grilla del home persistidos al reingresar).
  4. **NUEVO `directorio-session.js` (234 lineas, ASCII-safe)** compartido por los 5 directorios: `mmSaved` migrado a SLUG; `tSave` persiste a BD (`guardarDestino`/`quitarGuardado`) con sesion; hidratacion DB via `cargarMiMapa()` + `renderDir()`; migracion re-ejecutable de `mm_saved` legacy numerico -> slug (catalogo embebido Y API connector). Editados `directorio.html`, `directorio-hostal.html`, `directorio-comida.html`, `directorio-sitio.html`, `directorio-evento.html`: se elimino el `tSave` local duplicado (Tripwire 5 lineas) y se agrego `usuario-session.js` a los 4 sub-directorios.
- **Evidencia (ADR-006):** firmas verificadas en archivos reales HOY: `usuario-session.js` `estaVisitado` L850 / `estadoDestino` L875; `api/pagina-destino.js` `precargarEstado` L2648 + `window.onExploraCOUpdate=precargarEstado` L2661 + `if(ok===true)` L2511 + `#rvn` L2103; `index.html` `_hidratarGuardadosDB` L3491 -> `renderDest()` L3539; `directorio-session.js` `_mmSaved` L54, `tSave(slug,btn)` L165, hidratacion `cargarMiMapa()` L192-194, `window.tSave = tSave` L227.
- **Smokes / verificacion:** `node --check` OK en 3 JS; ASCII 0 bytes >127; balance de divs diff 0 (index + 5 directorios); `scripts/smoke_auditoria_pagina_destino.js` **61/61 PASS**; `scripts/smoke_estado_sesion_destino.js` **14/14 PASS** (NUEVO); `scripts/smoke_directorio_session.js` **14/14 PASS** (NUEVO); `check_buildHTML_inline.js` OK; `smoke_mapa_cultural.js` 58 checks OK. QA (qa-auditor): **APTO CON OBSERVACIONES**.
- **Relacion con bugs:** **BUG-078 NUEVO (CERRADO)** en BUGS_HISTORICOS.md; **BUG-002 sigue ABIERTO** (R3: doble escape `\u2605` L2473 de `api/pagina-destino.js`, deuda preexistente ajena a esta sesion).
- **Pendiente operativo:** QA visual en navegador de los 5 directorios y de la ficha (corazones, "estuve aqui" y resena con el nombre de la cuenta en una sola sesion); commit/deploy del release (assets frontend + `api/pagina-destino.js`; los assets NO cuentan contra el presupuesto 8/8).
- **Dependencia:** patron `usuario-session.js` existente (`refrescarSesion`, `cargarMiMapa`, `guardarDestino`/`quitarGuardado`); smokes previos de la ficha.
- **Fuera de alcance:** `api/interacciones.js` NO se toco (8/8 INTACTO); backend/`media_compartidos`; legacy R2 (consumidores `.then(function(ok){ if(ok) })` de `publicarResena` en `Monserrate2.html`, `lacandelaria2.html`, `gen_body7.js`, `_lacandelaria2_body.html`, `_monserrate2_body.html`, `_check_monserrate2.js`, `_tmp_lac2.js` - fuera de flujo Vercel); DECISIONS.md (sin ADR nuevo: se reusan GET existentes).

## Prioridad CAMPO ZONA (region natural) en el ADMIN general - 2026-09-20 (cierre express)

> Cierre documental EXPRESS (skill `express-mode`: un solo pase, docs-only, ruta FREE,
> sin tocar codigo) del nuevo campo `zona` (region natural) en el admin general
> (todas las categorias, incl. eventos) con migracion NUEVA 028 + exposicion en API.
> NO crea funciones serverless (**8/8 INTACTO**, ADR-001/ADR-010). La decision de
> arquitectura es el **ADR-049 (APROBADO)** en DECISIONS.md, escrito por `architect`
> (2026-09-20, NO se toca en este cierre) y NO se registra bug (el unico defecto QA
> se detecto y corrigio ANTES del deploy).

### TSK-145: Campo `zona` (region natural) en el admin general + migracion 028 + API [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-20, cierre documental express; **working tree, SIN commitear**). Verificado contra archivo real (ADR-006).
- **Prioridad:** Alta (dato curado de producto: region natural del destino, una sola, obligatoria en el admin).
- **Fecha:** 2026-09-20
- **Origen:** decision de producto del operador: agregar la region natural (`zona`) al destino, capturable desde el ADMIN general (todas las categorias, incl. eventos), con una sola zona OBLIGATORIA y valores cerrados Andina/Amazonica/Llanos/Caribe/Pacifico. `region` sigue siendo el departamento (campo existente, NO se toca). Documentado como **ADR-049** en DECISIONS.md.
- **ADR:** DECISIONS.md **ADR-049 (APROBADO, 2026-09-20)** -- escrito por `architect`; este cierre NO lo modifica (restriccion del cierre: un ADR lo escribe `architect`).
- **Responsable / agentes:** backend-dev/sql-security-free (migracion 028 + `api/admin-destinos.js` + `api/destinos.js`), admin-dev (`admin.html`), qa-auditor (Escudo GOLD + deteccion del defecto pre-deploy), docs-keeper-free (esta entrada de cierre).
- **Alcance REAL ejecutado (no el plan original si difiere):**
  1. **NUEVA migracion `db/migrations/028_destinos_zona.sql` (100 lineas, ADITIVA, idempotente ADR-008, ASCII-safe ADR-002):** `ALTER TABLE destinos ADD COLUMN IF NOT EXISTS zona TEXT` (L51-52); CHECK `destinos_zona_chk` idempotente via `DO $$ ... pg_constraint` (patron de 019/026) que permite NULL o los 5 valores cerrados (L59-68); indice `idx_destinos_zona` con `CREATE INDEX IF NOT EXISTS` (L74-75). Comentada y explicita la nomenclatura pendiente de alinear con la 027 (`andina`/`amazonica` vs `andes`/`amazonia`, sin FK por ahora; L31-36).
  2. **`admin.html`:** NUEVO `<select id="f-zona">` (L771) en el form general (UNA sola, compartida por las 5 categorias), con cableado completo: `clearForm` (ids L2674), `loadForm` (L3284 `'f-zona':p.zona||''`), `savePlace` (L3948 `zona: v('f-zona')`), `_placeToAPI` (L6057 `zona: p.zona||''`) y `_mergeNeonRowIntoLocal` (L6573 `local.zona = d.zona || local.zona`). Validacion OBLIGATORIA en `validateForm()` (L4076-4096): nueva fila `['fg-zona','f-zona','Selecciona la zona (region natural)']` (L4081) + guard dedicado que bloquea el guardado con toast (L4089-4093).
  3. **`api/admin-destinos.js`:** INSERT agrega columna/param `zona` (L153/L164/L187) normalizado a NULL cuando ausente/vacio (`(b.zona ? String(b.zona).trim() : null)`, L187) -- critico para no violar la CHECK; PUT agrega `zona` al fieldMap (L274); GET listar agrega `d.zona` al SELECT (L110).
  4. **`api/destinos.js`:** `toPlace()` expone `zona` (L49); modo mapa la incluye en el SELECT (L168) y en la proyeccion (L189).
  5. **Decision de producto registrada:** una sola zona por destino, obligatoria en UI admin, valores Andina/Amazonica/Llanos/Caribe/Pacifico; cubre eventos; `region` sigue siendo departamento.
- **Evidencia (ADR-006):** anclas reales verificadas el 2026-09-20: `db/migrations/028_destinos_zona.sql` (100 lineas, cabecera L1-45, CHECK L59-68, indice L74-75); `admin.html` L771 (`f-zona`), L2674, L3284, L3948, L4081/L4089-4093 (`validateForm`), L6057, L6573; `api/admin-destinos.js` L110/L153/L164/L187/L274; `api/destinos.js` L49/L168/L189.
- **Smokes / verificacion:** `node --check` OK en `api/admin-destinos.js` y `api/destinos.js`; ASCII 0 bytes > 127 en la migracion y en ambos APIs; balance de divs `admin.html` 815/815 diff 0; INSERT 35:35:35 (columnas con placeholder : placeholders : params) verificado; `validateForm` bloquea sin zona (codigo real L4089-4093); migracion aditiva/idempotente y CHECK permite NULL (L66). QA (qa-auditor) detecto y se corrigio ANTES del deploy un defecto: el INSERT enviaba `''` que la CHECK rechazaba -> 500 en el pipeline de los 103 `load-*-api.js`; corregido a NULL en L187.
- **Relacion con bugs:** NO se registra bug nuevo (el defecto del `''` se detecto y corrigio pre-deploy; solo nota breve en BUGS_HISTORICOS.md seccion de observaciones). Decision de arquitectura: **ADR-049 (APROBADO)** en DECISIONS.md, escrito por `architect` (NO se toca en este cierre).
- **Pendiente operativo (BLOQUEANTE):** aplicar `db/migrations/028_destinos_zona.sql` en Neon ANTES de desplegar el backend (si no, `42703 column does not exist`); luego deploy + commit. Orden obligatorio: 028 en Neon -> deploy backend -> commit.
- **Deuda registrada (para NEXT.md):**
  (a) los 103 `scripts/load-*-api.js`, `api/publicar-lugar.js` (mi-lugar.html) y `scripts/upload-eventos.js` NO envian `zona` -> fichas/eventos creados por esas vias quedan SIN zona (deuda).
  (b) la zona NO se muestra ni se filtra aun en directorios/mapa/ficha (solo admin + API).
  (c) slugs `andina`/`amazonica` (028) vs `andes`/`amazonia` (027) -- sin FK por ahora.
  (d) etiqueta `#f-barrio` sigue siendo "Barrio / Zona" (posible confusion con el nuevo campo "Zona").
- **Dependencia:** migraciones 003-027 aplicadas en Neon (la 028 es la siguiente).
- **Fuera de alcance:** DECISIONS.md (el ADR-049 lo escribio `architect` y NO se toca en este cierre); `api/interacciones.js` NO se toco (8/8 INTACTO); directorios/mapa/ficha no renderizan la zona aun (deuda b); `api/publicar-lugar.js`/loaders/upload-eventos sin `zona` (deuda a).

## Prioridad FIX DE VOTOS DE FOTOS CURADAS (BUG-079) - 2026-09-20 (cierre express)

> Cierre documental EXPRESS (skill `express-mode`: un solo pase, docs-only, ruta FREE,
> sin tocar codigo) del fix que evita que al actualizar los datos de una entrada del
> directorio desde el admin se pierda la puntuacion de las fotos (votos/comentarios de
> media curada huerfanos por la semantica REPLACE de la galeria). NO existia tarea
> abierta de galeria/fotos (TSK-136..TSK-140 COMPLETADAS) -> cierre directo del bug sin
> TSK nuevo ni IDs inventados. NO crea funciones serverless (**8/8 INTACTO**, ADR-001)
> ni migraciones. Decision de arquitectura: **ADR-050** en DECISIONS.md.

### Cierre BUG-079: al actualizar los datos de una entrada del directorio se perdia la puntuacion de las fotos (votos de media curada) [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-20, cierre documental express; **working tree, SIN commitear**). Verificado contra archivo real (ADR-006). Bug registrado: **BUGS_HISTORICOS.md BUG-079 (CERRADO)**; decision: **DECISIONS.md ADR-050 (APROBADO)**.
- **Prioridad:** Alta (perdida real de datos de producto: la puntuacion de las fotos curadas desaparecia en cada guardado del admin).
- **Fecha:** 2026-09-20
- **Origen:** reporte del operador: al actualizar los datos de una entrada del directorio se pierde la puntuacion de las fotos. Causa raiz DOBLE: (1) `api/admin-destinos.js` hacia REPLACE total de `destinos_fotos` (DELETE + re-INSERT) generando ids nuevos -> `media_votos`/`media_comentarios` (fuente='curada'), que cuelgan de `destinos_fotos.id::text`, quedaban huerfanos (patron de tabla no versionada BUG-021); (2) `admin.html` no preservaba `id_neon`/caption al recomponer el payload y `_cargarFotosDeNeon()` solo fusionaba con el registro local VACIO (nunca al editar; dejaba sin recolectar fotos Unsplash, BUG-062).
- **ADR:** DECISIONS.md **ADR-050 (APROBADO, 2026-09-20)** -- addendum que enmienda la premisa "`destinos_fotos.id` NO es ancla estable" del ADR-030 (L822-823): el id SI es estable mientras la fila se preserva; la inestabilidad era del REPLACE, no del esquema.
- **Responsable / agentes:** admin-dev/renderer-dev (`admin.html`), backend-dev (`api/admin-destinos.js` v2.2), qa-auditor (Escudo GOLD + smoke vm), docs-keeper-free (esta entrada de cierre).
- **Alcance REAL ejecutado (no el plan original si difiere):**
  1. **`admin.html`:** `_photoToObj()` (L4656-4671) normaliza fotos a objetos; `getPhotos()` devuelve `{url,caption,id_neon,es_hero,orden}` (L4712-4735); `_placeToAPI()` envia `fotos_galeria` con TODAS las fotos desde indice 0 (la hero viaja con `id_neon` + `es_hero:true`; `foto_hero` string aparte) (L6068+); `_cargarFotosDeNeon()` FUSIONA por URL (local gana caption; id_neon/es_hero/orden de Neon) y corre SIEMPRE al editar una entrada publicada (L6219+; cierra BUG-062). VERSION bump a `admin-v9.20260920`.
  2. **`api/admin-destinos.js` (v2.2):** `normFotosGaleria()` (L38; id uuid canonico o serial 1-10 digitos, invalido -> null) y `reemplazarFotosGaleria()` (L83) = MERGE transaccional `sql.transaction` (L168): match por id -> UPDATE conservando el id; sin id, fallback por url unica no usada -> UPDATE conservando el id; sin match -> INSERT; DELETE parametrizado SOLO de filas no usadas; coherencia `es_hero` con `foto_hero`; guard anti-perdida 400 SOLO con items pero ninguno con url valida. **Caso "sin fotos":** merge omitido, galeria Neon preservada, sin 400.
- **Evidencia (ADR-006):** 8 comentarios `BUG-079` en `admin.html` (L2818/L3300/L4656/L4677/L4713/L6076/L6214/L6712) y 5 en `api/admin-destinos.js` (L8/L35/L67/L353/L485); VERSION `admin-v9.20260920`; cero 'BUG-056' residual en ambos archivos.
- **Smokes / verificacion:** smoke vm **4/4** (A: hero + galeria curadas preservan ids; B: solo hero sin 400; C: sin fotos -> galeria Neon preservada, sin 400; D: 400 solo con items invalidos). `node --check` OK x2; ASCII-safety 0/0/0; balance de divs `admin.html` 815/815 diff 0. QA (qa-auditor): **APTO**.
- **Relacion con bugs:** **BUG-079 NUEVO (CERRADO)** y **BUG-062 CERRADO** (colateral: las fotos Unsplash del registro local ahora se recolectan al editar). **BUG-056** sigue como precedente del REPLACE (pendiente `dedupe_destinos_fotos.js --apply` + indice unico para datos historicos). Decision: **ADR-050**.
- **Pendiente operativo:** correr `scripts/diagnose_fotos_huerfanas.js` (NUEVO, read-only) en produccion con `DATABASE_URL` para cuantificar los votos curados YA huerfanos por el REPLACE historico y decidir remedio (reanclar por url a la fila actual unica, con backup, tipo db/cleanups/); commit/deploy del release junto a TSK-145/TSK-144/TSK-143 (028/estado persistente/drawer pendientes del mismo working tree).
- **Deuda registrada (para NEXT.md):**
  (a) votos huerfanos historicos en Neon (medicion + re-anclaje pendientes).
  (b) sin via desde el admin para vaciar por completo la galeria (minimo 1 foto; el caso "sin fotos" preserva lo existente).
  (c) `_syncFotosGaleria` en `admin.html` (L6193, 0 call-sites) = codigo muerto; `GUIA_DE_DESARROLLO.md` L482 lo cita como flujo vivo (doc-drift).
  (d) `es_hero` no exclusivo por contrato (si el front manda dos, gana la ultima).
- **Dependencia:** semantica REPLACE previa (BUG-056/ADR-030) y todo el working tree del 2026-09-20 (028/estado persistente/drawer) para el deploy.
- **Fuera de alcance:** el texto original del ADR-030 NO se toca (Cero Borrado Logico; el ADR-050 lo enmienda); `api/interacciones.js` NO se toco (**8/8 INTACTO**); la ficha (`api/pagina-destino.js`) sigue sin votar fotos curadas (MVP del ADR-030 intacto, ahora con ancla estable disponible a futuro).

## Prioridad FIX DE RENDER DE MEDIA DEL MAPA CULTURAL + DIAGNOSTICO NEON - 2026-09-21 (BUG-080 / TSK-146)

> Cierre del reporte directo del operador: los videos de viajero de la cuenta
> `gonzalezjavierbta@gmail.com` no aparecian como pines en el mapa de `index.html`
> (ni volvian a aparecer al navegar hacia su ubicacion), y un supuesto 4o video
> "rastro mc-trampas" no aparecia ni en Museo ni en mapas. La investigacion (ADR-006)
> confirmo un fallo de FRONTEND en el motor compartido `mapa-cultural.js` y que el
> video reportado NO EXISTE en la BD. NO crea funciones serverless (**8/8 INTACTO**,
> ADR-001/ADR-010) ni migraciones; `api/interacciones.js` NO se toco. Bug registrado:
> **BUGS_HISTORICOS.md BUG-080**. Sin ADR nuevo (fix de defecto, sin decision de
> arquitectura).

### TSK-146: Fix de render de media del mapa cultural + diagnostico Neon del video reportado [COMPLETADA en codigo]

- **Estado:** COMPLETADA EN CODIGO (2026-09-21; **working tree, SIN commitear**; deploy pendiente). Verificado contra archivo real (ADR-006).
- **Prioridad:** Alta (reporte directo del usuario).
- **Fecha:** 2026-09-21
- **Origen:** reporte de que los videos de `gonzalezjavierbta@gmail.com` no aparecian en el mapa de `index.html` ni de `comunidad.html`, y que un supuesto 4o video "rastro mc-trampas" no aparecia ni en Museo ni en mapas. Bug registrado: **BUGS_HISTORICOS.md BUG-080**.
- **Responsable / agentes:** renderer-dev/frontend-tpl (`mapa-cultural.js`, `index.html`, `comunidad.html`), data-migration/sql-security-free (diagnostico read-only contra Neon), docs-keeper (esta entrada de cierre).
- **Alcance REAL ejecutado (no el plan original si difiere):**
  1. **Causa raiz frontend y fix (ver BUG-080):** `onMoved()` de `mapa-cultural.js` (L663-666) ahora re-ejecuta tambien `renderMedia()` ademas de `recluster()`; el atajo "Todo" de `filterPins()` (L947-950) delega en `setMediaEnabled(true)` cuando `!st.mediaEnabled || mediaTiposActivos() === 0` (rellena los 3 tipos) y si no llama `renderMedia()`; cache-bust `mapa-cultural.js?v=6` -> `?v=7` en `index.html` (L883) y `comunidad.html` (L566).
  2. **Diagnostico read-only contra Neon:** confirmo que el backend SI devuelve la media (`?tipo=multimedia_mapa` devolvia los 3 videos vigentes) y que "rastro mc-trampas" NO existe en la BD (busqueda `ILIKE '%rastro%'` en `album_fotos`, `destinos_fotos` e `interacciones` = 0 filas). El backend no era la causa.
  3. **Herramientas nuevas de diagnostico (working tree, SIN commitear):** `scripts/neon_select.js` (SELECT/WITH read-only; rechaza escritura), `scripts/load_env_local.js` (carga la credencial de conexion a Neon desde `.env.local`, ignorado por git; el valor nunca se documenta) y `db/queries/q1_rastro_video.sql` .. `q4_rastro_busca_global.sql`.
- **Evidencia (ADR-006):** ver BUGS_HISTORICOS.md BUG-080. Respuestas JSON de `node scripts/neon_select.js -f db/queries/q1_rastro_video.sql` (5 videos de la cuenta) y de `scripts/diagnose_video_mapa.js` (videos mapa_ok=3, fallan=2 por `activo=false`); `git status` = `M mapa-cultural.js`, `M index.html`, `M comunidad.html`, `M scripts/diagnose_video_mapa.js`, `?? scripts/neon_select.js`, `?? scripts/load_env_local.js`, `?? db/queries/`.
- **Smokes / verificacion:** `node --check mapa-cultural.js` OK; ASCII 0 bytes >127; balance de divs (index 370/370, comunidad 320/320); `scripts/smoke_mapa_cultural.js` OK. **Ampliacion del smoke con casos de regresion EN CURSO** (moveend re-renderiza media; "Todo" rellena tipos).
- **Relacion con bugs:** **BUG-080 NUEVO (CORREGIDO EN CODIGO)** en BUGS_HISTORICOS.md. El hallazgo de "rastro mc-trampas" queda como **nota operativa dentro del mismo BUG-080** (video reportado como subido que no existe en la BD). **NO es un bug de backend** (el backend devolvia la media correctamente). Descarta la hipotesis de starvation BUG-069 para este caso (5 filas de album / 1147 de destinos, muy por debajo de 300/600).
- **Pendiente operativo (BLOQUEANTE para produccion):** **deploy del fix** (commit/push + Vercel) para que el cache `?v=7` llegue a produccion; ampliar `scripts/smoke_mapa_cultural.js` con los casos de regresion. Confirmar con el usuario el mapa de `comunidad.html`: el mapa personal "Mi Viaje" excluye la media de album por diseno (**ADR-047 Enmienda 1 / BUG-074**).
- **Dependencia:** motor compartido `mapa-cultural.js` (ADR-045); `?tipo=multimedia_mapa` del backend (sin cambios).
- **Fuera de alcance:** `api/*.js` NO se toco (**8/8 INTACTO**); sin migraciones; sin ADR nuevo; el valor de la credencial de Neon (`.env.local`) NUNCA se documenta (politica de secretos).

## Prioridad UBICACION POR RECURSO + CARPETAS DE GUARDADOS + FIX DE SEGURIDAD DEL MAPA - 2026-09-21 (ADR-051 / ADR-052 / BUG-081 / TSK-147)

> Cierre de una sesion con DOS features + un fix de SEGURIDAD sobre el mismo release
> `api/interacciones.js` **v24**: (1) ubicacion individual por recurso de `album_fotos`
> (pin por video/foto, migracion **029**) y (2) carpetas privadas de guardados de media
> (tabla `guardados_carpetas` + `media_guardados.carpeta_id`, migracion **030**); mas el
> cierre de una **fuga de media privada** en `multimedia_mapa` con `scope=mio` sin sesion
> (**BUG-081**). Migraciones 029 y 030 **YA APLICADAS en Neon el 2026-09-21** (idempotentes;
> sin backfill). NO crea funciones serverless (**8/8 INTACTO**, ADR-001/ADR-010).
> Decisiones: **ADR-051** y **ADR-052** en DECISIONS.md (mas la **ENMIENDA 2 del ADR-047**).

### TSK-147: Ubicacion por recurso de `album_fotos` (ADR-051) + carpetas de guardados (ADR-052) + fix de seguridad `scope=mio` (BUG-081) + migraciones 029/030 [COMPLETADA en codigo]

- **Estado:** COMPLETADA EN CODIGO (2026-09-21; **working tree, SIN commitear**; deploy pendiente). Verificado contra archivo real (ADR-006).
- **Prioridad:** Alta (2 features de producto + fix de seguridad ALTA/CRITICA).
- **Fecha:** 2026-09-21
- **Origen:** pedido del operador: (a) poder ubicar cada video/foto en su propio punto del mapa (no solo por su carpeta); (b) organizar los guardados de media en carpetas privadas; y cierre del hallazgo de seguridad en el toggle "Solo mio" del mapa.
- **ADRs:** DECISIONS.md **ADR-051 (APROBADO)** y **ADR-052 (APROBADO)**; **ENMIENDA 2 al ADR-047** (el mapa personal ahora incluye la media de album propia del dueno via `_propia`; `filterMediaDefault` intacto).
- **Responsable / agentes:** backend-dev/sql-security-free (`api/interacciones.js` v24), data-migration/sql-security-free (migraciones 029/030 + `scripts/apply_sql_file.js`), frontend-tpl/renderer-dev (`mi-perfil.html`, `mymapa.js`, `map-picker.js`, `index-api-connector.js`), qa-auditor (Escudo GOLD), docs-keeper (esta entrada de cierre).
- **Alcance REAL ejecutado (no el plan original si difiere):**
  1. **Feature A / ADR-051 (ubicacion por recurso, migracion 029):** `db/migrations/029_album_fotos_coords.sql` (NUEVA, aditiva/idempotente/ASCII-safe): `album_fotos.lat/lng DOUBLE PRECISION NULL` + CHECK `album_fotos_coords_chk` (ambos NULL o ambos no NULL) + idx `idx_album_fotos_coords`. Sin backfill (`filas_con_coords_propias=0`). `api/interacciones.js` v24: `multimedia_mapa` emite `COALESCE(af.lat,a.lat)` (L4810); `GET museo_recurso` expone `lat_propia/lng_propia/coords_heredadas` + `lat/lng` efectivas (L3838-3873); `POST museo_recurso` crear/editar persisten `af.lat/lng` del recurso, aceptan `album_lat/album_lng` (COALESCE al sembrar) y `quitar_coords` (L6573/L6588/L6675-6726/L6754-6759). Semantica de fallback: recurso -> album -> `coordsFallbackAutor`.
  2. **Feature B / ADR-052 (carpetas de guardados, migracion 030):** `db/migrations/030_guardados_carpetas.sql` (NUEVA, aditiva/idempotente): tabla `guardados_carpetas` (+ `idx_guardados_carpetas_usuario`) + `media_guardados.carpeta_id uuid NULL REFERENCES guardados_carpetas(id) ON DELETE SET NULL` (+ `idx_media_guardados_carpeta`). `GET mis_guardados_media` suma `carpeta_id/carpeta_nombre` + `carpetas:[]` y YA NO degrada a `[]` (503 `SCHEMA_NOT_MIGRATED`); nueva rama `POST ?tipo=guardados_carpeta` (crear|renombrar|eliminar|mover) con `validarSesion` obligatorio; eliminar = soft-delete sin borrar bookmarks (`carpeta_id=NULL`, ADR-003). NO toca Museo/albumes.
  3. **Fix de SEGURIDAD (BUG-081):** `multimedia_mapa scope=mio` ahora EXIGE sesion firmada (`400 SESION_REQUERIDA`), deriva el uuid del token e ignora el query param `usuario_id`; la clausula de visibilidad pasa a `(mmScopeMio && mmUsuarioId ? '' : ' AND af.visible = true')` (L4824), de modo que la fuga de privados de terceros queda cerrada. Antes: `mmScopeMio ? '' : ' AND af.visible=true'` sin auth.
  4. **Frontend:** `mi-perfil.html` (prefill desde `lat_propia`, boton "Quitar ubicacion", espacio del recurso para guardados con ver/votar/quitar/guardar-en-carpeta + chips de carpetas, reutilizando `mediaCardHTML` y `window.MediaActions`); `mymapa.js` (merge de media propia `scope=mio` con Bearer + `_propia` en `filterMisMapa`/`medirMediaActiva`, ENMIENDA 2 ADR-047); `map-picker.js` (pin del modal arrastrable); `index-api-connector.js` (Bearer en el fetch `scope=mio`). Cache-bust: `mapa-cultural.js?v=7`, `mymapa.js?v=4`, `map-picker.js?v=2`, `index-api-connector.js?v=2`.
  5. **Herramienta nueva:** `scripts/apply_sql_file.js` (aplicador de archivos `.sql` contra Neon, ASCII-safe).
- **Evidencia (ADR-006):** migraciones 029 (`ADD COLUMN IF NOT EXISTS lat/lng` L84-85, CHECK `album_fotos_coords_chk` L97-100, idx L114) y 030 (`CREATE TABLE guardados_carpetas` L81-83, `carpeta_id` L125, indices L99/L136); `api/interacciones.js` v24 header L1-22, `SESION_REQUERIDA` L4771, clausula L4824, proyeccion GET L3838, POST `guardados_carpeta` L7171-7288; `mi-perfil.html` L818/L2449-2456/L2479-2483/L1982-2199; `mymapa.js` L203/L247-257/L319-330; `map-picker.js` L229-230; `index-api-connector.js` L358-361. `git diff --numstat`: `api/interacciones.js` +313/-67, `mi-perfil.html` +318/-17, `mymapa.js` +71/-10, `map-picker.js` +20/-10, `index-api-connector.js` +6/-1, `index.html`/`comunidad.html`/`admin.html` +1/-1 c/u (cache-bust).
- **Smokes / verificacion:** Escudo GOLD + smokes nuevos de 029/030 **EN CURSO**. **PENDIENTE: documentar el resultado al correrlos** (aqui no se afirma un PASS no verificado).
- **Relacion con bugs:** **BUG-081 NUEVO (CORREGIDO EN CODIGO)** en BUGS_HISTORICOS.md (fuga de media privada). Sin otros bugs nuevos; el fix del reset de `museoQuitarCoords` queda como pendiente.
- **Handoff de migraciones:** **029 y 030 YA ESTAN APLICADAS en Neon (2026-09-21)**, idempotentes y sin backfill (`filas_con_coords_propias=0`). Por tanto el gate operativo no es "aplicar migraciones" sino **desplegar el backend v24 DESPUES de las migraciones (ya cumplido) y LUEGO el frontend**.
- **Pendiente operativo (BLOQUEANTE para produccion):** deploy (commit/push + Vercel) en orden: 029/030 (YA aplicadas) -> backend (`interacciones.js` v24) -> frontend. Y el fix del reset de `museoQuitarCoords`.
- **Deuda registrada (para NEXT.md):**
  (a) fix del reset de `museoQuitarCoords` pendiente (si el usuario pulsa "Quitar ubicacion" y cierra el modal sin guardar, el flag puede quedar en un estado no deseado hasta reabrir el modal, que lo resetea a false en `museoAbrirModal` L2484; revisar `museoCerrarModal` L2509).
  (b) smokes nuevos de 029/030 en curso (sin resultado documentado aun).
  (c) `?tipo=mis_guardados_media` cambia de degradacion a `[]` (ADR-032) a 503 `SCHEMA_NOT_MIGRATED`; clientes viejos deben manejarlo.
- **Dependencia:** migraciones 029/030 aplicadas en Neon (YA) y el resto del working tree 2026-09-20/21 para el deploy.
- **Fuera de alcance:** NO crea funciones serverless (**8/8 INTACTO**); NO toca el Museo ni `albumes`/`album_fotos` en la Feature B; la credencial de conexion a Neon (`.env.local`) NUNCA se documenta (politica de secretos).

## Prioridad GAMIFICACION v6 / ADR-053 - 2026-09-21 (TSK-148)

> Cierre de la entrega "Gamificacion v6 / ADR-053" (implementacion COMPLETA y
> verificada): `M_nivel` lineal x1.0 (N1) a x3.0 (N20) con doble cap SECUENCIAL
> 5.0/10.0, 20 umbrales reescalados con techo 42000, ledger unico de XP
> (`xp_ledger`), config sin deploy de los caps (`gamificacion_config`), insignia
> historica (`usuarios.nivel_max`) vs nivel derivado de `xp_total`, repricing de
> los 17 consumibles y rama admin `GET ?recurso=salud_red`. NO crea funciones
> serverless (**8/8 INTACTO**, ADR-001/ADR-010): todo entra por ramas existentes
> (`?recurso=` en `api/admin.js`, `?tipo=` en `api/usuarios.js`/`api/interacciones.js`).
> Decision: **ADR-053 (APROBADO + ENMIENDA 1)** en DECISIONS.md (se actualiza a
> **IMPLEMENTADO**). Spec: `docs/superpowers/specs/2026-09-21-gamificacion-nivel-scaling-v6-design.md`.

### TSK-148: Gamificacion v6 / ADR-053 -- M_nivel con doble cap, umbrales 42000, xp_ledger, gamificacion_config, nivel_max, repricing y `?recurso=salud_red` [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-21). Backend + migracion + smokes **COMMITEADOS** (`c875675` "gamificacion v6: adr-053 nivel scaling x1.0-x3.0 + migracion 031" y `9efbfc7` "gamificacion v6 fase 3: motor xp nivel scaling x1.0-x3.0, umbrales 42000, salud_red y smokes v25", HEAD). Frontend (los 8 espejos + toast/barra/UI de cupo + pestana admin) queda en **working tree, SIN commitear** (deploy pendiente). Verificado contra archivo real (ADR-006).
- **Prioridad:** Alta (rediseno de la economia de XP: mecanismo nuevo de recompensa creciente + auditoria + recalibracion).
- **Fecha:** 2026-09-21
- **Origen:** `gamming.txt` propone "Gamificacion v2.0" (multiplicador de nivel x1.0-x3.0, decaimiento "Rising Star Decay" y tabla nueva de umbrales). La auditoria del codigo real (ADR-006) mostro que el decaimiento viola la Cero Borrado Logico (ADR-003) y que el stack vigente ya llega a x5.72 (x17.16 con nivel x3.0 sin cap), por lo que se disena `M_nivel` con doble cap + reescalado + ledger.
- **ADR:** DECISIONS.md **ADR-053 (APROBADO, 2026-09-21)** + **ENMIENDA 1** (segunda opinion de `@architect-review`: APROBADO CON CAMBIOS, 4 hallazgos ALTO). Estado del ADR actualizado a **IMPLEMENTADO** en este cierre.
- **Responsable / agentes:** architect/architect-review (diseno + Enmienda 1), backend-dev/sql-security (motor + migracion 031), data-migration (`scripts/apply_sql_file.js`), frontend-tpl/renderer-dev/admin-dev (8 espejos, toast, barra, salud de la red), qa-auditor (Escudo GOLD), docs-keeper (esta entrada de cierre).
- **Alcance REAL ejecutado (no el plan original si difiere):**
  1. **Fase 1 (diseno):** `ADR-053` en DECISIONS.md (L~2723-3083) con **Enmienda 1** (L3054+) que corrige 4 hallazgos ALTO: router real `?recurso=` de `api/admin.js` (no `?tipo=`), **7+ espejos** de umbrales (faltaba `admin.html:_jugNiveles`), **al menos 22** puntos de escritura de `xp_total` (no 19) y la semantica de `mult_stack` / `media_compartidos.xp_ganado` (guarda el FINAL). Spec en `docs/superpowers/specs/2026-09-21-gamificacion-nivel-scaling-v6-design.md` (seccion 16 = Enmienda 1).
  2. **Fase 2 (BD):** `db/migrations/031_gamificacion_v6_nivel_scaling.sql` (24495 bytes) creada, COMMITEADA (`c875675`) y **APLICADA en Neon** (11 sentencias OK). Contenido: `usuarios.nivel_max smallint NOT NULL DEFAULT 1` (sembrado con la tabla VIEJA -> **ningun usuario pierde insignia**); `gamificacion_config` (seed `cap_progresion=5.0`, `cap_global=10.0`, `m_nivel_max=3.0`); `xp_ledger` (13 columnas, multiplicadores `numeric(10,6)`, CHECK `cap_aplicado IN ('ninguno','progresion','global','accion')`, 2 indices); y repricing ABSOLUTO de los 17 consumibles en `consumibles.precio_xp` (impulso x2.0, resto x1.6) con guard `information_schema` para las columnas de la 027 (no aplicada).
  3. **Fase 3 (backend):** `api/interacciones.js` **v25** (motor: `obtenerMultiplicadorNivel`, `leerConfigGamificacion`, `calcularXpFinal` reescrito con doble cap secuencial 5.0/10.0, `calcularXpAcreditado`, `armarXpDetalle`, `registrarXpLedger`, `esLiderDestino`, `completitudSpotAtributos`; catalogo unico `XP_BASES` con **19 claves** verificadas; **29 call-sites** de `registrarXpLedger` (1 def + 29 usos) y **20 call-sites** de `calcularXpAcreditado`; nuevas bases `resena_larga` 30, `foto_viajero` 20, `ao_checkin` 20, `ao_proponer` +30 directo (cap 3/dia), `plan_crear` +20 (cap 3/dia), `plan_unirse` +6 (cap 5/dia), `spot_atributos` +10, bono rural 25; misiones `mis_plan_creador` 25->10 y `mis_plan_unido` 15->10; nueva rama `?tipo=spot_atributos`). `api/usuarios.js` **v19** (20 umbrales nuevos con techo 42000 + campo `mult`, `nivel_max`/`nivel_visible` con `GREATEST`, costos de eleccion 800/500/500 en constantes unicas). `api/admin.js` **v4** (rama nueva `GET ?recurso=salud_red` con por_dia, por_accion, caps, `distribucion_nivel {derivado, visible}`, exentos, `nivel_max_vs_derivado`, alertas; degradacion 42P01).
  4. **Fase 4 (frontend, COMMITEADA en `d803ce7` y PUSHEADA a `origin/main`):** sincronizados los **8 espejos** de umbrales (`api/usuarios.js` fuente, `api/interacciones.js`, `admin.html`, `usuario-session.js`, `index.html`, `comunidad.html`, `niveles-data.js`, `api/admin.js` con el espejo `NIVEL_DERIVADO_SQL`) + los 20 titulos; **errata corregida** en la fuente: el titulo 11 paso de `Estrat\u00e9ga` a **`Estratega Comunitario`**; toast con **desglose de XP** (`xp_detalle`) y **deduplicacion** en todas las acciones (incluida la ficha dinamica via `usuario-session.js` y los conectores legacy); **barra de progreso** al siguiente nivel (`progresoNivel`); **UI informativa de cupo/enfriamiento** (`mostrarEstadoCupo`); **pestana admin "Salud de la Red"** + leaderboard; textos de repricing sincronizados en `mi-perfil.html`; `directorio-session.js` ya no duplica el toast de XP con sesion activa.
- **Evidencia (ADR-006, verificada el 2026-09-21):** `db/migrations/031_gamificacion_v6_nivel_scaling.sql` (24495 bytes; `usuarios.nivel_max` L107-108, cabecera L1-70); `api/interacciones.js` L1 (header v25), `XP_BASES` L291 (19 claves), `registrarXpLedger` L469, `?tipo=spot_atributos` (14 refs), `mis_plan_creador`/`mis_plan_unido` (3 refs c/u); `api/usuarios.js` L1-45 (header v19, `NIVELES` L33+, `mult`, titulo 11 `Estratega Comunitario` L44); `api/admin.js` L16/L21/L64 (`NIVEL_DERIVADO_SQL`)/L574 (`recurso === 'salud_red'`); `usuario-session.js` (`progresoNivel` L110/L128, `mostrarEstadoCupo` L159/L165, dedup del toast L800/L891/L1152-1157); `api/pagina-destino.js` backticks=0 / doble-escape=0 / no-ASCII=0 (cierra BUG-002).
- **Smokes / verificacion:** `npm test` **VERDE (exit 0)** con `scripts/smoke_gamificacion_v6.js` (**30 checks**, RESULTADO OK) y `scripts/smoke_niveles_espejos.js` (**10/10**, fuente + 7 espejos + `BADGES_LOCAL` + titulos de `niveles-data.js`) nuevos; smokes legacy en verde: `smoke_test_gamificacion_v4.js` 95/95, `smoke_038_casas_clases.js` 78/78, `smoke_021_xp_decimal_rankings.js` 45/45, `smoke_036_compartir.js` 55/55, `smoke_visita_geocerca.js` 15/15 (bono rural 45 = 20+25) y `smoke_niveles_data.js` 31/31. Nuevos scripts npm: `test`, `smoke:gamificacion`, `smoke:espejos` (`package.json`). Nota: `scripts/smoke_test_epic_prompt.js` mantiene **4 FAIL preexistentes** (53 checks, 49 PASS; DQ-2), ajenos a esta entrega.
- **Relacion con bugs:** **BUG-002 CERRADO** (los 2 backticks de `api/pagina-destino.js:1646` y el doble escape de `:2473` ahora en 0) y **cierre del doble toast de XP** registrado en `NEXT.md:246`. Sin bugs nuevos de esta entrega; DQ-2 (`smoke_test_epic_prompt.js`) se mantiene como deuda QA preexistente.
- **Deuda registrada (para NEXT.md):**
  (a) **`spot_atributos` "nunca al creador" no es enforceable:** `destinos` no tiene columna de creador; se implemento dedup por `(usuario, destino)` contra `xp_ledger`. Deuda: migracion futura `destinos.creado_por`.
  (b) **Contrato `estado_cupo`:** el backend NO expone aun un campo unico de estado de cupo/enfriamiento por accion; la UI informa solo lo que algunas ramas ya mandan (429, `tope_diario`). El helper de UI queda listo.
  (c) **Fichas estaticas legacy:** >100 HTML con parches inline de XP en `localStorage` (+25/+8 XP) que no llaman a la API; deuda de migracion al renderer dinamico.
  (d) **`smoke_test_epic_prompt.js`:** 4 FAIL preexistentes (vocaciones 3->4 por ADR-026 y filtro de `chat_salas`), ajenos a esta entrega (DQ-2).
  (e) **`gamificacion_config` no parametriza umbrales** (solo caps): recalibrar la curva 42000 exige deploy (deuda aceptada del ADR-053 R-6).
  (f) **Techo 42000 sin datos de calibracion** (7 usuarios, max ~1630 XP): revision cuando exista poblacion (>= 10 usuarios en Nivel >= 12 o 90 dias de ledger).
- **Deploy (HECHO 2026-09-21):** `main` = `origin/main` = **`d803ce7`** (commits `c875675` migracion/ADR -> `9efbfc7` backend+smokes -> `d803ce7` frontend/8 espejos+UI+admin). Vercel despliega al push; **cache-bust NO requerido** (`vercel.json` sirve todo `/(.*)\.js` con `Cache-Control: no-store`). La migracion 031 esta aplicada en Neon. Residual: verificacion visual en produccion (toast con desglose, barra de progreso, UI de cupo y pestana "Salud de la Red").
- **Dependencia:** migracion 031 aplicada en Neon (YA) y el resto del working tree 2026-09-20/21 para el deploy conjunto.
- **Fuera de alcance:** NO crea funciones serverless (**8/8 INTACTO**, ADR-001/ADR-010); NO toca `destinos.tags` (sin campos JSONB nuevos, ADR-003); el "Rising Star Decay" y la tabla `user_action_decay` quedan SUPERSEDIDOS explicitamente; el valor de la credencial de Neon (`.env.local`) NUNCA se documenta (politica de secretos).

## Prioridad GUARDADOS DE MEDIA EN "MIS ALBUMES" - 2026-09-21 (ADR-054 / BUG-082 / TSK-149)

> Cierre del release "Guardados en Mis Albumes" (ADR-054): se ELIMINA el concepto de
> carpetas privadas de guardados (ADR-052) y los bookmarks de `media_guardados` se
> organizan en `albumes` propios, con PUBLICACION POR GUARDADO (visible solo en el
> detalle del album). Sobre el MISMO release: fix de privacidad ALTA **BUG-082** en
> `api/pagina-destino.js`. Migracion NUEVA **032** (idempotente/ASCII-safe),
> **APLICADA en Neon el 2026-09-21** (idempotencia verificada por segunda
> corrida) y release **PUSHEADO a `origin/main`** (commit `b4ad861`). NO crea
> funciones serverless (**8/8 INTACTO**, ADR-001/ADR-010). Decision: **ADR-054**
> en DECISIONS.md (Estado actualizado a IMPLEMENTADO Y DESPLEGADO).

### TSK-149: Guardados de media en "Mis Albumes" (ADR-054) + migracion 032 + fix BUG-082 [IMPLEMENTADA Y DESPLEGADA]

- **Estado:** IMPLEMENTADA Y DESPLEGADA (2026-09-21; migracion 032 aplicada en Neon + push `b4ad861`). Verificado contra archivo real (ADR-006).
- **Prioridad:** Alta (rediseno del modelo de guardados: unifica el concepto de contenedor + fix de privacidad ALTA).
- **Fecha:** 2026-09-21
- **Origen:** decision de producto del operador: eliminar las carpetas privadas de guardados (ADR-052) y organizarlos dentro de "Mis Albumes", con publicacion opcional por guardado.
- **ADR:** DECISIONS.md **ADR-054 (APROBADO + revision de `@architect-review` con condiciones C1-C5)**; supersede el concepto de carpetas de ADR-052 (se conservan sesion firmada y 503 tipado).
- **Responsable / agentes:** architect/architect-review (diseno + condiciones C1-C5), backend-dev/sql-security-free (`api/interacciones.js` v26 + `api/pagina-destino.js` BUG-082), data-migration (`db/migrations/032`), frontend-tpl/renderer-dev (`mi-perfil.html`, `mymapa.js`), qa-auditor (Escudo GOLD), docs-keeper (esta entrada de cierre).
- **Alcance REAL ejecutado (no el plan original si difiere):**
  1. **Migracion 032 / ADR-054:** `db/migrations/032_guardados_album.sql` (NUEVA, idempotente/ASCII-safe, 17152 bytes): agrega `media_guardados.album_id uuid NULL REFERENCES albumes(id) ON DELETE SET NULL` + `visible boolean NOT NULL DEFAULT false` + CHECK `media_guardados_visible_album_chk (visible=false OR album_id IS NOT NULL)` + 2 indices; y **DROP** de `guardados_carpetas` y de `media_guardados.carpeta_id`. **APLICADA en Neon el 2026-09-21** (8/8 sentencias OK; idempotencia confirmada por segunda corrida). Verificacion post OK: `album_id`/`visible` presentes, FK `ON DELETE SET NULL`, CHECK `media_guardados_visible_album_chk`, 2 indices, `COUNT(*) WHERE visible AND album_id IS NULL = 0`, y `guardados_carpetas`/`media_guardados.carpeta_id` eliminados.
  2. **Backend `api/interacciones.js` v26:** `mis_guardados_media` EXIGE sesion (deriva el dueno del token e ignora `usuario_id` del query), devuelve `albumes[]` + `mi_album_id`/`mi_album_titulo`/`visible` por item y conserva `data[]` (shape de `mymapa.js`) y el 503 `SCHEMA_NOT_MIGRATED` tipado; `guardados_carpeta` se reescribe a `accion=album|publicar` (crear/renombrar/eliminar/mover -> 410 `CARPETAS_DEPRECADAS`; album ajeno -> 404 `ALBUM_NO_ENCONTRADO`; bookmark ajeno -> 404 `GUARDADO_NO_ENCONTRADO`; desasignar fuerza `visible=false` en la MISMA sentencia); `album_detalle` agrega `guardados[]`/`albumes_guardados[]` con invariante de no-fuga; hardening **BUG-061** en `guardar_media`/`quitar_guardado_media`/`album_crear`.
  3. **Fix de privacidad (BUG-082):** `api/pagina-destino.js` agrega `AND af.visible=true` (L2762) a la consulta de fotos de album por cercania.
  4. **Frontend:** `mi-perfil.html` (chips/select por album + toggle "Hacer publico" + `fetchConJwt`), `mymapa.js` (Bearer). Escudo GOLD HTML: divs 419/419.
- **Evidencia (ADR-006):** `db/migrations/032_guardados_album.sql` (17152 bytes, 0 bytes >127); `api/interacciones.js` header v26 L1-6; `api/pagina-destino.js` L2762 (`WHERE af.activo=true AND af.visible=true AND ...`); `scripts/smoke_032_guardados_album.js` (15621 bytes). `git status` LIMPIO; release PUSHEADO a `origin/main` en el commit `b4ad861` (= HEAD = `origin/main`; "adr-054: guardados de media en mis albumes (migracion 032 + backend v26 + frontend + smokes)"): `api/interacciones.js`, `api/pagina-destino.js`, `mi-perfil.html`, `mymapa.js`, `package.json`, `scripts/smoke_029_030_coords_carpetas.js`, `scripts/smoke_036_media_unificada.js`, `db/migrations/032_guardados_album.sql`, `scripts/smoke_032_guardados_album.js`.
- **Smokes / verificacion:** NUEVO `scripts/smoke_032_guardados_album.js` (**45 checks**); poda de `scripts/smoke_029_030_coords_carpetas.js` (**42**); `scripts/smoke_036_media_unificada.js` J35 (**90**); `package.json` encadena los 3. **`npm test` = 536 PASS / 0 FAIL (exit 0)**, corrido contra archivo real. Escudo GOLD HTML divs 419/419.
- **Relacion con bugs:** **BUG-082 NUEVO (CORREGIDO EN CODIGO)** en BUGS_HISTORICOS.md (fuga de privacidad ALTA; viola ADR-039 D.1). Hardening del **BUG-061** (el alias legacy `POST tipo='foto'` sigue confiando en `usuario_id`; ver deuda).
- **Handoff de migraciones / orden de deploy (EJECUTADO):** la 032 se aplico en Neon y el release (backend v26 + frontend) se pusheo en `b4ad861`; Vercel despliega al push (no requiere cache-bust: `vercel.json` sirve todo `/(.*)\.js` con `no-store`). El DROP de la 032 abria ventana de 503 para el backend v24/v25 vivo si se aplicaba antes del deploy del backend nuevo (el backend viejo lee `guardados_carpetas`/`carpeta_id` que la 032 elimina); el release se ejecuto en el orden previsto.
- **Pendiente operativo (UNICO, no bloqueante de codigo):** **QA runtime en produccion** (navegador con sesion real) del flujo de guardados en "Mis Albumes", del toggle "Hacer publico" y del fix BUG-082.
- **Deuda registrada del release (fuente unica) [DEUDA]:**
  (a) `api/utilidades.js` con 24 backticks + 3 dobles escapes (ADR-002), preexistente.
  (b) catch vacios preexistentes en `api/interacciones.js` / `api/pagina-destino.js`.
  (c) alias legacy `POST tipo='foto'` (raiz de BUG-061) sigue confiando en `usuario_id`.
  (d) `albumes.fotos_count` no suma guardados publicados (v1 solo detalle de album).
  (e) vocabulario "Carpeta" del Museo (ADR-039) sin unificar.
  (f) **[DEUDA] runner `scripts/apply_sql_file.js` no relaya eventos NOTICE:** usa el driver HTTP `@neondatabase/serverless` (`neon(url)`), que no emite NOTICE, por lo que los `RAISE NOTICE` de salvaguarda de la 032 (conteos pre-DROP) se emitieron pero no se capturaron; mejora sugerida: usar `Pool`/`Client` con `client.on('notice', ...)` para capturarlos.
- **Dependencia:** release desplegado (migracion 032 aplicada en Neon el 2026-09-21 + push `b4ad861` a `origin/main`).
- **Fuera de alcance:** NO crea funciones serverless (**8/8 INTACTO**); el DROP de `guardados_carpetas` es irreversible (perdida aceptada de la organizacion previa, ADR-054); la credencial de conexion a Neon (`.env.local`) NUNCA se documenta (politica de secretos).

## Prioridad EL TALLER DE LAS MOSCAS - 2026-09-21/22 (cierre express)

> Cierre documental EXPRESS (skill `express-mode`: un solo pase, docs-only, ruta FREE,
> sin tocar codigo; la pagina ya fue cargada y verificada en produccion). Publicacion a
> produccion de la pagina dinamica "El Taller de las Moscas" (slug `taller-de-las-moscas`,
> categoria `sitio`/subcultura, Bogota/Chapinero). No nace ADR nuevo (se siguen patrones
> existentes: seed+loader+smoke, ADR-009 rating en 0, BUG-022 fotos Wikimedia) ni bug
> nuevo de ExploraCO (la observacion del QA sobre `validate_ficha.js` .json vs .md ya
> esta registrada como BUG-034 y NO se duplica): DECISIONS.md y BUGS_HISTORICOS.md NO
> se tocaron.

### TSK-150: Pagina dinamica taller-de-las-moscas (sitio, Bogota/Chapinero) - "El Taller de las Moscas" [COMPLETADA]

- **Estado:** COMPLETADA (2026-09-21/22, cierre documental express). Verificado contra archivo real (ADR-006) y contra produccion (URL HTTP 200 + sitemap.xml + API destinos).
- **Prioridad:** Alta (contenido nuevo en produccion; no bloquea runtime ni deploy pendiente).
- **Fecha:** 2026-09-21 (ejecucion/carga) - 2026-09-22 (verificacion en produccion y cierre documental).
- **Slug / destino en produccion:** `taller-de-las-moscas` (categoria `sitio`, subcultura; ciudad Bogota, region Bogota D.C., barrio Chapinero Central); **id Neon `99938930-aa6d-48d9-b353-6f2016f8e7ea`**, `status=published`. URL viva: https://exploraco.vercel.app/taller-de-las-moscas.html (HTTP 200, ~81KB).
- **Alcance REAL ejecutado (no el plan original si difiere, ADR-006):**
  1. **Ficha curada** -> `ficha/taller de las moscas.json` (JSON valido, untracked). Datos verificados del espacio independiente de Chapinero: Cra. 19a #61b 81, horario Mie-Sab 2:00 PM - 8:00 PM, entrada libre, FAQ x5, tours autoguiado, Instagram @tallerdelasmoscas.
  2. **Fotos resueltas en Wikimedia Commons** (compliance BUG-022): HOGRE street art, Melaka Art Gallery, Taller Nacional de Grafica y ZineDisplay; galeria en `destinos_fotos` verificada via `/api/interacciones?tipo=galeria_destino` (IDs 2201-2204+).
  3. **3 scripts creados** siguiendo patrones existentes (TSK-066/068/069/077/142): `scripts/seed-taller-de-las-moscas.js` (upsert Neon), `scripts/load-taller-de-las-moscas-api.js` (loader API DELETE+POST), `scripts/smoke_test_taller-de-las-moscas.js` (fake_neon + buildHTML). Los 4 archivos quedan **untracked**.
  4. **Verificacion local (Escudo GOLD):** `node --check` 3/3 OK; ASCII-safety 0/0/0; smoke **14/14 PASS**; divs 248/248 diff=0.
  5. **CARGA A PRODUCCION ejecutada y verificada:** destino **id `99938930-aa6d-48d9-b353-6f2016f8e7ea`** `status=published` confirmado via `/api/destinos?categoria=sitio`. La URL https://exploraco.vercel.app/taller-de-las-moscas.html responde **HTTP 200** y renderiza completa (hero, sobre, dificultad, entradas, tours, que llevar, itinerario, FAQ, mapa, resenas, "Tambien te puede interesar", JSON-LD).
  6. **Limpieza del huerfano `taller-delas-moscas-bogota-4qfn`:** eliminado por el DELETE previo del loader; ya NO aparece en sitemap.xml (verificado 2026-09-22) ni en admin-destinos. **Causa raiz:** el slug no se persistia en el formulario admin + foto vacia rompia `buildHTML` -> 404 del registro residual.
  7. **Rating en 0:** sin resenas sembradas (ADR-009); la ficha muestra "0.0 (0 resenas)".
- **Evidencia (ADR-006):** archivos reales verificados HOY: `ficha/taller de las moscas.json`, `scripts/seed-taller-de-las-moscas.js`, `scripts/load-taller-de-las-moscas-api.js`, `scripts/smoke_test_taller-de-las-moscas.js` (`git status` = `??` x4). En produccion: URL .html HTTP 200 con nombre + direccion; sitemap.xml incluye `taller-de-las-moscas.html` (lastmod 2026-09-22) y NO incluye `taller-delas-moscas-bogota-4qfn`; `/api/destinos?categoria=sitio` devuelve el registro `99938930-aa6d-48d9-b353-6f2016f8e7ea` `status=published`.
- **Smokes / verificacion:** `smoke_test_taller-de-las-moscas.js` **14/14 PASS**; `node --check` 3/3; ASCII-safety 0/0/0; divs 248/248 diff=0.
- **Relacion con bugs:** ninguno nuevo. **BUG-034** (drift documental de `scripts/validate_ficha.js` .json vs .md) sigue ABIERTO y ya registrado; NO se duplica. DECISIONS.md y BUGS_HISTORICOS.md NO se tocaron.
- **Observacion menor del QA (deuda `[DEUDA-EXPRESS]`):** 2 `catch` vacios en `scripts/seed-taller-de-las-moscas.js` = deuda PREEXISTENTE del patron de seeds (~106 seeds); NO se toca este triplete para mantener paridad con los demas seeds.
- **Pendiente operativo:** QA visual opcional en navegador (no bloqueante).
- **Dependencia:** patron seed+loader+smoke validado (TSK-066/068/069/077/142); compliance BUG-022 en fotos; ADR-009 (rating en 0).
- **Fuera de alcance:** tocar codigo del motor; DECISIONS.md ni BUGS_HISTORICOS.md; modificar los 4 archivos untracked (se dejan para commit del operador).

## Prioridad MERCADO DE EMPRENDEDORES - 2026-09-23 (ADR-055 / TSK-151)

> Cierre de la entrega "Mercado de Emprendedores": 3 mercados INDEPENDIENTES (uno por
> Casa) con normas propias, habilidad global "Emprendedor" sobre `usuarios.mercado_puntos`
> (METRICA DE PROGRESO, NO moneda; no viola ADR-018), compra atomica por CTEs y
> produccion de consumibles. Decision: **ADR-055** en DECISIONS.md. Bug: **BUG-083**
> (cabecera de la migracion 034 inconsistente con su cuerpo; CERRADO en esta sesion).
> NO crea funciones serverless (**8/8 INTACTO**, ADR-001/ADR-010). Migracion NUEVA
> **034** (aditiva/idempotente/ASCII-safe), **PENDIENTE de aplicar en Neon** (la 027 ya
> fue aplicada por el operador el 2026-09-23).

### TSK-151: Mercado de Emprendedores -- 3 mercados por Casa, habilidad `Emprendedor` (`mercado_puntos`), compra atomica por CTEs y produccion de consumibles [IMPLEMENTADO EN WORKING TREE]

- **Estado:** IMPLEMENTADO EN WORKING TREE (2026-09-23); `npm test` VERDE (exit 0). Verificado contra archivo real (ADR-006).
- **Prioridad:** Alta (nueva capa de economia de mercado; migracion pendiente de aplicar en Neon).
- **Fecha:** 2026-09-23
- **Origen:** decision de producto del operador: habilitar comercio de consumibles entre usuarios dentro de cada Casa, con normas propias por Casa.
- **ADR:** DECISIONS.md **ADR-055** (IMPLEMENTADO EN WORKING TREE).
- **Responsable / agentes:** architect (diseno + ADR), sql-security/data-migration (`db/migrations/034`), backend-dev (`api/interacciones.js` v28 + `api/usuarios.js` v21 + `api/admin.js` v5), frontend-tpl/renderer-dev (`mercado.js`, `comunidad.html`, `mi-perfil.html`, `admin.html`), qa-auditor (Escudo GOLD + `scripts/smoke_mercado.js`), docs-keeper (esta entrada de cierre).
- **Alcance REAL ejecutado (no el plan original si difiere):**
  1. **Migracion 034 / contrato de esquema CONGELADO:** `db/migrations/034_mercado_emprendedores.sql` (NUEVA, aditiva/idempotente ADR-008/ASCII-safe ADR-002, 360 lineas): `usuarios.mercado_puntos numeric(12,2) NOT NULL DEFAULT 0`; `mercado_config` (PK `casa`, normas por Casa + semilla condor 2%/25%, jaguar 5%/10%, delfin 0%/5%); `mercado_ofertas` (aisladas por `casa`); `mercado_ventas` (ledger append-only con desglose subtotal/impuesto/arancel/neto); **seccion 4-bis** (auto-provision idempotente de `precio_xp_base`/`precio_xp_actual`/`tipo_canje`, NO-OP si la 027 ya corrio); semilla de consumibles producibles (`prod_artesania`/`prod_cafe`/`prod_souvenir`, `tipo_canje='producir'`). **PENDIENTE de aplicar en Neon** (preflight read-only en la cabecera).
  2. **Backend `api/interacciones.js` v28:** GET `?tipo=mercado_config|mercado_ofertas|mercado_mi`; POST `?tipo=mercado_publicar|mercado_comprar|mercado_cancelar|mercado_producir`. Habilidad global `MERCADO_NODOS` (5 nodos, tiers `[0,100,250,450,700]`), **gate doble de nivel APLICADO** (`nodoMercadoPorNivel`/`calcularMercadoEfectivo`: nodo efectivo = `min(puntos, nivel)`, con `nivel_jugador` `[2,5,10,20,30]`), `impuestoEfectivoMercado` (piso 0) y `slotsMercado`. Compra atomica en UNA sentencia con CTEs (`WITH ok_oferta/ok_xp/debit/dec/cred/venta`; sin `FOR UPDATE`) y `23514` -> 409 `OFERTA_NO_DISPONIBLE`. Anti-farming 20 compras/24h (429 `LIMITE_COMPRAS_24H`), autocompra (403) y cross-Casa no permitido (403). Sesion firmada (`usuarioDeSesion`, leccion BUG-061); 503 `SCHEMA_NOT_MIGRATED` si falta la 034. Ledger `xp_ledger` best-effort (compra/venta exentas).
  3. **Backend `api/usuarios.js` v21:** el perfil (GET `?id=`) expone `mercado_puntos`/`mercado_nodo` (aditivo, owner-aware y publico), con espejo minimo `MERCADO_TIERS`/`calcularMercadoLocal` que aplica el MISMO gate doble (`MERCADO_NIVELES = [2,5,10,20,30]`; prohibido el import entre serverless; degrada a 0 sin la 034).
  4. **Backend `api/admin.js` v5:** rama NUEVA `?recurso=mercado` con `mercado_config_lista`/`mercado_config_editar`/`mercado_ofertas_lista`/`mercado_ofertas_moderar` (moderar SOLO cancela; no borra, ADR-003).
  5. **Frontend:** `mercado.js` NUEVO (`window.Mercado` v1.0.0, ASCII-safe); tab Mercado en `comunidad.html`; card Emprendedor en `mi-perfil.html`; pantalla Mercado en `admin.html`.
- **Evidencia (ADR-006):** `db/migrations/034_mercado_emprendedores.sql` (360 lineas, ASCII 0); `api/interacciones.js` header v28 L1-15 (`MERCADO_NODOS` L1173-1179; `calcularMercado` L1181; `nodoMercadoPorNivel` L1201-1208; `calcularMercadoEfectivo` L1209-1213; `impuestoEfectivoMercado` L1217; `mercado_mi` owner-only L6177; compra CTE L9665; `23514`->409 L9677); `api/usuarios.js` header v21 L2-6 + `nodoMercadoPorNivelLocal` L121 + `calcularMercadoLocal` L129; `api/admin.js` header v5 L35-37 + rama `?recurso=mercado` L547; `mercado.js` (`window.Mercado`); `comunidad.html`/`mi-perfil.html`/`admin.html`; `scripts/smoke_mercado.js`.
- **Smokes / verificacion:** `npm test` **VERDE (exit 0)** con `scripts/smoke_mercado.js` **38/38 PASS** encadenado (script npm `smoke:mercado`). Escudo GOLD: `node --check` OK; ASCII 0/0 en `api/*.js`, `mercado.js`, migracion 034 y smoke; divs 0 en `comunidad.html` (323/323), `mi-perfil.html` (421/421) y `admin.html` (915/915).
- **Relacion con bugs:** **BUG-083 NUEVO (CERRADO en esta sesion)** en BUGS_HISTORICOS.md: la cabecera de la 034 prometia una seccion "4-bis" de auto-provision que NO existia en el cuerpo (el artefacto se contradecia); se agrego la seccion 4-bis real y el smoke C6 la fija. **BUG-061** sigue ABIERTO (ajeno).
- **Pendiente operativo (BLOQUEANTE):** (1) aplicar `db/migrations/034_mercado_emprendedores.sql` en Neon (la **027 ya fue aplicada por el operador el 2026-09-23**; la 034 auto-provisiona sus columnas en 4-bis); (2) deploy del backend (v28/v21/v5); (3) deploy del frontend (`mercado.js` + `comunidad.html`/`mi-perfil.html`/`admin.html`; sin cache-bust, `vercel.json` sirve todo `/(.*)\.js` con `no-store`). Orden: **034 en Neon -> backend -> frontend**.
- **Deuda aceptada [DEUDA]:** (a) `mercado_puntos` sin ledger por evento; (b) validar `mercado_mi` con sesion real en Neon; (c) contrato de oferta/demanda con datos reales; (d) 027/028 y demas deudas de arrastre siguen su propio release. (El enforcement del tope por `nivel_jugador` (nodos 2-5) ya NO es deuda: el gate doble quedo APLICADO en esta entrega, nodo efectivo = `min(puntos, nivel)`.)
- **Dependencia:** migracion 034 aplicada en Neon; ADR-055; ADR-028/ADR-018/ADR-038/ADR-041/ADR-053.
- **Fuera de alcance:** NO crea funciones serverless (**8/8 INTACTO**); no toca el arbol de RAMAS (reconciliacion en ADR-055 decision 9); no define RLS (aislamiento por DATOS).

## Prioridad CONSUMIBLES CON GATE POR ERA - 2026-09-23 (ADR-056 / TSK-152)

> Entrega "Consumibles con gate por era" (banda exclusiva de compra): la tienda
> pasa de catalogo plano a tienda por era. Decision: **ADR-056** en DECISIONS.md
> (spec/migracion/codigo ya ALINEADOS a ADR-056). NO crea funciones serverless
> (**8/8 INTACTO**, ADR-001/ADR-010). Migracion NUEVA **035**
> (aditiva/idempotente/ASCII-safe), **APLICADA en Neon el 2026-09-23** (5
> sentencias OK; verificacion: 32 filas; NULL=8, Caminante=3, Explorador=3,
> Cronista=6, Leyenda=7, Mito=5). Smoke
> `scripts/smoke_test_consumibles_era.js` pasa **55/55** y esta **encadenado a
> `npm test`** (script `smoke:consumibles`; suite VERDE, 0 FAIL).

### TSK-152: Consumibles con gate por era (banda exclusiva de compra) -- `consumibles.era_exclusiva`, 15 nuevos (3 por era) + 9 premium backfilleados [APLICADO / VERIFICADO]

- **Estado:** APLICADO / VERIFICADO (2026-09-23); verificado contra archivo real (ADR-006). Migracion 035 **APLICADA en Neon el 2026-09-23** (`node scripts/apply_sql_file.js db/migrations/035_consumibles_era.sql`, 5 sentencias OK, "todas OK"). Verificacion post-aplicacion: columna `consumibles.era_exclusiva` presente y **32** consumibles (NULL=8, Caminante=3, Explorador=3, Cronista=6, Leyenda=7, Mito=5). Queda pendiente el deploy del backend y del frontend.
- **Prioridad:** Alta (migracion YA aplicada en Neon; el gate queda inactivo en produccion hasta desplegar el backend).
- **Fecha:** 2026-09-23
- **Origen:** decision de producto del operador: tienda de consumibles por era (banda exclusiva de compra).
- **ADR:** DECISIONS.md **ADR-056** (IMPLEMENTADO Y MIGRACION 035 APLICADA EN NEON).
- **Responsable / agentes:** architect (diseno + ADR), sql-security/data-migration (`db/migrations/035`), backend-dev (`api/interacciones.js` + `api/admin.js`), frontend-tpl/renderer-dev (`admin.html` + `mi-perfil.html`), docs-keeper (esta entrada de cierre).
- **Alcance REAL ejecutado (no el plan original si difiere):**
  1. **Migracion 035:** `db/migrations/035_consumibles_era.sql` (NUEVA, aditiva/idempotente ADR-008/ASCII-safe ADR-002): `consumibles.era_exclusiva varchar(20) NULL` (`ADD COLUMN IF NOT EXISTS`; `NULL` = tienda base; sin CHECK por ADR-028 ni indice); backfill idempotente de 9 premium (Cronista 3, Leyenda 4, Mito 2) por listas literales de claves; semilla de 15 consumibles nuevos (3 por era) que reutilizan tipos de efecto existentes (catalogo resultante en el estado real de Neon: **32** = 17 previos + 15 nuevos; la 034 NO esta aplicada, por eso sus 3 `prod_*` no existen; 35 si la 034 se aplica). **APLICADA en Neon el 2026-09-23** (`node scripts/apply_sql_file.js db/migrations/035_consumibles_era.sql`, 5 sentencias OK).
  2. **Backend `api/interacciones.js`:** helper unico `calcularEraVisibleLocal(xpTotal, nivelMax)` (espejo documentado de `conNivel`, ADR-053); `GET ?tipo=consumibles` suma `era_exclusiva` y calcula `bloqueado` con `usuario_id` (degradacion sin la columna -> `null`); `POST ?tipo=comprar_consumible` responde `403 ERA_INSUFICIENTE` si `era_exclusiva` no coincide (chequeo antes del anti-farming y del UPDATE); `GET ?tipo=inventario` calcula la era sobre el nivel ganado (el uso NO se gatea). Sin bump de version (header sigue v28; hallazgo ADR-006).
  3. **Backend `api/admin.js` (`?recurso=consumibles`):** `consumibles_lista` suma `era_exclusiva`; `consumibles_crear`/`consumibles_editar` la aceptan; normalizador `normalizarEraConsumible` ('' / null / 'ninguna' -> null; case-insensitive contra las 5 eras; invalido -> null). Sin bump de version (header sigue v5; hallazgo ADR-006).
  4. **Frontend:** `admin.html` `<select>` de era (Sin gate + Caminante/Explorador/Cronista/Leyenda/Mito) en el form y el modal; `mi-perfil.html` card bloqueada con candado y texto "Disponible en era <era>" (el boton Usar sigue siempre activo).
- **Evidencia (ADR-006):** `db/migrations/035_consumibles_era.sql`; `api/interacciones.js` (`calcularEraLocal` L783-789; `calcularEraVisibleLocal` L795-799; `consumibles` L5870+; `inventario` L5926-5952; `comprar_consumible` L8779-8822 con `ERA_INSUFICIENTE`); `api/admin.js` (`normalizarEraConsumible` L155-159); `admin.html`; `mi-perfil.html`. `git status`: la 035 y la spec estan untracked; `api/interacciones.js`, `api/admin.js`, `admin.html` y `mi-perfil.html` modificados.
- **Smokes / verificacion:** `scripts/smoke_test_consumibles_era.js` (NUEVO, harness `vm` + fake neon, sin red ni BD) existe y pasa **55/55** (`node scripts/smoke_test_consumibles_era.js`): helper `calcularEraVisibleLocal`, `GET consumibles` con `era_usuario`/`bloqueado`, `403 ERA_INSUFICIENTE`, `409` por XP sin gate, uso `200` sin gate de era, checks de la migracion 035 (columna/15 claves/backfill/idempotencia/ASCII) y wiring en `api/interacciones.js`/`admin.html`/`mi-perfil.html`. **AHORA SI esta encadenado al script `test` de `package.json`** (script `smoke:consumibles`); `npm test` corre VERDE (0 FAIL en toda la suite; el smoke nuevo pasa 55/55). No se re-ejecuto el Escudo GOLD en este pase docs-only.
- **Relacion con bugs:** ninguno nuevo. **BUG-021/BUG-060** (patron migracion-antes-de-deploy) aplican. **BUG-061** sigue ABIERTO (ajeno).
- **Pendiente operativo:** (1) **HECHO:** `db/migrations/035_consumibles_era.sql` APLICADA en Neon el 2026-09-23 (32 filas verificadas); (2) deploy del backend (gate + admin) y del frontend (`admin.html`/`mi-perfil.html`; sin cache-bust). Orden: **035 en Neon (HECHO) -> backend -> frontend**.
- **Deuda aceptada [DEUDA]:** (a) los items de eras pasadas no se pueden recomprar (banda exclusiva, aceptado); (b) no hay gate de uso (decision explicita); (c) **[CERRADA]** el smoke del gate pasa 55/55 y esta encadenado a `npm test`; (d) **[CERRADA]** numeracion alineada a ADR-056 en spec/migracion/codigo; (e) headers de version no bumpeados.
- **Dependencia:** migracion 035 APLICADA en Neon (2026-09-23); ADR-053 (nivel ganado); ADR-028 (catalogo administrable); ADR-042 (columnas de la 027); ADR-055 (producibles `prod_*` sin gate).
- **Fuera de alcance:** NO crea funciones serverless (**8/8 INTACTO**); no toca el motor de efectos (los 15 nuevos reutilizan tipos existentes); no gatea el uso.

## Prioridad GUARDAR ALBUM + MUSEO PERSONAL FUERA DEL MAPA - 2026-09-23 (ADR-057 / TSK-153)

> Entrega: guardar un album personal desde su visor (con XP dual ejecutor +
> dueno), excluir el album auto "Mi Museo" del mapa publico y confirmar que el
> album guardado sale en "mi museo". Modo **express** (skill `express-mode`).
> Decision: **ADR-057** en DECISIONS.md. NO crea funciones serverless
> (**8/8 INTACTO**, ADR-001/ADR-010) y **NO requiere migracion** (reusa
> `media_guardados` de la 019/032 y `xp_ledger` de la 031, cuyo `accion` es
> `text` sin CHECK).

### TSK-153: Guardar album (XP dual 5/10) + album personal fuera del mapa publico + guardados en mi museo [IMPLEMENTADO EN WORKING TREE]

- **Estado:** IMPLEMENTADO EN WORKING TREE (2026-09-23); verificado contra archivo real (ADR-006). Commit/deploy pendiente.
- **Prioridad:** Media-Alta.
- **Fecha:** 2026-09-23.
- **Origen:** pedido del operador: los albumes de "mi museo" son personales y no deben salir en mapas publicos; al entrar a un album debe poder guardarse y eso debe salir en "mi museo"; la accion da puntos a quien la ejecuta y al dueno; la escala de XP crece con la complejidad.
- **ADR:** DECISIONS.md **ADR-057**.
- **Responsable / agentes:** backend-dev (`api/interacciones.js`), frontend-tpl (`galeria.html`/`comunidad.html`), js-silo-dev (`mapa-cultural.js`), qa-auditor/docs-keeper (verificacion y cierre).
- **Alcance REAL ejecutado:**
  1. **Backend `api/interacciones.js`:**
     - `XP_BASES` suma `album_guardado: 5` y `album_guardado_autor: 10` (catalogo unico, Regla de No-Duplicidad).
     - `GET ?tipo=album_detalle` devuelve `ya_guardado_album` (bookmark fuente='album' del usuario del query) y `es_propio` (usuario del query == dueno del album).
     - `POST ?tipo=guardar_media` rama `fuente='album'`: detecta el alta (`gmYaActivo`), acredita **5 XP al ejecutor** y **10 XP al dueno** (solo si es distinto del ejecutor, anti self-farm) con el pipeline canonico (`contextoXpE` -> `calcularXpAcreditado` -> `registrarXpLedger` -> `acreditarClaseYCofre` -> `repartirXpReferidos`); reactivar NO re-paga.
     - `GET ?tipo=multimedia_mapa` rama `album_grupo`: excluye el album auto "Mi Museo" con match **tolerante a acentos** via `translate(lower(...), chr(...), 'aaeeiioouuun')` (sin bytes no-ASCII en el fuente, ADR-002).
     - `GET ?tipo=albumes` con `excluir_museo` usa el MISMO match tolerante a acentos.
  2. **Frontend:** `galeria.html` (`gOpenAlbum` envia `usuario_id`; el boton Guardar del modal usa `ya_guardado_album` y se oculta si `es_propio`); `comunidad.html` (`abrirAlbumModal` agrega boton Guardar del album, alineado a la derecha con `.av-album-head` flex, oculto si `es_propio`); `mapa-cultural.js` (`filterMediaDefault` descarta `album_grupo` "Mi Museo" con match tolerante a acentos via NFD). `mi-perfil.html` **SIN cambios**: `mis_guardados_media` ya pinta los albumes guardados en la grilla de "Mis guardados" (requisito "que salga en mi museo").
- **Evidencia (ADR-006):** `api/interacciones.js` (`XP_BASES` L351-352; `album_detalle` L5012-5025 y respuesta L5076; `guardar_media` L8333-8399; `album_grupo` L5606; `albumes` L4906); `galeria.html` (L559-568, L644-645, L661-663); `comunidad.html` (L185-186, L2125-2135); `mapa-cultural.js` (L200-205).
- **Smokes / verificacion:** `node --check` OK (`api/interacciones.js`, `mapa-cultural.js`); ASCII-safety `api/interacciones.js` 0 bytes >127 y 0 backticks; balance de divs `galeria.html` 84/84 y `comunidad.html` 325/325; **`npm test` VERDE (exit 0)** tras actualizar dos contratos de smoke que fijaban el catalogo/call-sites: `smoke_gamificacion_v6.js` (24 -> **26** claves de `XP_BASES`) y `smoke_038_casas_clases.js` (call-sites de XP **21 -> 23** y `acreditarClaseYCofre` **20 -> 22**).
- **Relacion con bugs:** ninguno nuevo. **BUG-061** (guardar_media legacy sin validar sesion en ramas de destino) sigue ABIERTO y ajeno; esta entrega NO lo empeora (la rama exige sesion firmada desde ADR-054).
- **Pendiente operativo:** commit + push (Vercel despliega al push); QA runtime en produccion (guardar album ajeno -> +5 ejecutor / +10 dueno solo la primera vez; "Mi Museo" ausente del mapa).
- **Deuda aceptada [DEUDA-EXPRESS]:** (a) el badge `albumes.fotos_count` no cuenta los guardados publicados (arrastre de ADR-054); (b) la lectura por `usuario_id` de `album_detalle` permite observar `ya_guardado_album`/`es_propio` de un tercero sin sesion (deuda D-11 heredada); (c) la curaduria de MODIFICACION de fichas (proponer/votar cambios) queda DIFERIDA a Fase 2 con ADR propio.
- **Dependencia:** migraciones 019/023/032 ya aplicadas en Neon; `xp_ledger` (031) sin CHECK en `accion`.
- **Fuera de alcance:** NO crea funciones serverless (**8/8 INTACTO**); sin migracion; NO mueve las fotos individuales (siguen rigiendose por `album_fotos.visible`); NO implementa la curaduria de modificacion (Fase 2).

## Prioridad MUSEO PUBLICO (BUG-060 + BUG-084) - 2026-09-23 (TSK-154)

> Cierre del bug "el museo publico no se visualiza": causa raiz DOBLE (datos +
> codigo). NO toca el motor ni crea funciones serverless (**8/8 INTACTO**,
> ADR-001/ADR-010). Sin ADR nuevo. Registro de bugs en BUGS_HISTORICOS.md
> (BUG-060 CERRADO + BUG-084 NUEVO CERRADO).

### TSK-154: Museo publico no se visualiza -- migracion 004 aplicada (BUG-060) + fix del fallback `AS` duplicado (BUG-084) [CERRADA / DESPLEGADA]

- **Estado:** CERRADA / DESPLEGADA (2026-09-23). Verificado contra archivo real (ADR-006) y contra produccion en vivo.
- **Prioridad:** ALTA (el Museo de viajero no abria).
- **Fecha:** 2026-09-23.
- **Origen:** reporte del usuario: `perfil.html?id=<uuid>` (Museo de viajero) no abria; el frontend mostraba `pfError` ("No se pudo abrir el museo").
- **Responsable / agentes:** backend-dev (fix de codigo) + operador (aplicar la migracion en Neon) + qa-auditor/docs-keeper (verificacion y cierre).
- **Alcance REAL ejecutado:**
  1. **Fix de DATOS (BUG-060):** se aplico `db/migrations/004_usuarios_blog_autor.sql` en Neon con `node scripts/apply_004_foto_url.js` (idempotente, ADR-008). Confirmado en vivo durante la aplicacion: `[1] Antes: foto_url=AUSENTE ciudad_base=EXISTE`; resultado: `foto_url` text y `ciudad_base` character varying existen; "VEREDICTO: OK - esquema migrado". Con la columna presente, `queryConAvatarFallback` deja de activarse por `42703`.
  2. **Fix de CODIGO (BUG-084):** en `api/interacciones.js` (rama `museo_publico`) el reemplazo de `queryConAvatarFallback` paso de `['foto_url', 'avatar_url AS foto_url']` a `['foto_url', 'avatar_url']` (hoy L4312), con comentario explicativo (L4298-4304). La plantilla YA aporta `__FOTO_URL__ AS foto_url`; incluir `AS` en el reemplazo generaba `avatar_url AS foto_url AS foto_url` -> **SQLSTATE 42601** -> **HTTP 500**, incluso para UUID inexistentes (devolvia 500 en vez de 404). Commit **`1302f7c`** ("museo publico: fix fallback avatar_url AS duplicado (BUG-060)"), pusheado a `origin/main` (rango `016d0b3..1302f7c`); Vercel despliega al push.
- **Evidencia (ADR-006):**
  - Codigo: `git show 1302f7c` = `api/interacciones.js` +5/-2 (2 hunks: comentario + reemplazo); `node --check api/interacciones.js` OK; ASCII bytes>127 = 0 (delta 0 vs HEAD); cero cambios colaterales. Auditoria: **GOLD PASS**.
  - Barrido: los **9 call sites** de `queryConAvatarFallback` auditados; NINGUN otro tiene el `AS` duplicado (los demas usan el reemplazo por defecto sin `AS`).
  - En vivo (produccion `https://exploraco.vercel.app`, 2026-09-23): `GET /api/interacciones?tipo=museo_publico&id=3b78efad-e9f6-49a7-bbd1-af836f528348` -> **HTTP 200** con payload completo (usuario, vitrina, logros, cromos, albumes, mapa, arbol, parche, stats); antes 500. `GET ...&id=<uuid inexistente>` -> **HTTP 404**; antes 500. `GET ?tipo=museo_recurso&usuario_id=...` -> 200 y `GET ?tipo=mis_fotos&usuario_id=...` -> 200 (ya funcionaban).
  - Smoke: `scripts/smoke_017_perfil_arbol_casas.js` = **67/73 PASS**, IDENTICO al baseline en HEAD (mismos 6 fallos preexistentes: B5, C1a, C1b, C1c, C2a, C2b, por el gate DM nivel<3 y el calculo nivel/badge/era); cero regresiones nuevas.
- **Relacion con bugs:** **BUG-060 CERRADO** (migracion 004 aplicada; antes "MITIGADO... PENDIENTE") y **BUG-084 NUEVO CERRADO** (variante del fallback con `AS` duplicado). **BUG-061** (spoofing `usuario_id` en `tipo='foto'`) sigue ABIERTO y ajeno.
- **Deuda / pendiente (fuera de alcance, NO corregido):** (a) `perfil.html:979` hace el fetch de `museo_publico` SIN JWT, por lo que el dueno de un perfil privado (`perfil_publico=false`) veria "Museo privado" en vez de su propio museo; (b) los mensajes de error del frontend son genericos; (c) BUG-061 sigue ABIERTO.
- **Fuera de alcance:** NO crea funciones serverless (**8/8 INTACTO**); sin ADR nuevo; no se toca el motor de gamificacion.
- **Dependencia:** migracion 004 (ya aplicada en Neon el 2026-09-23).

## Prioridad MULTIPLICADOR DE ORIGEN POR LEJANIA - 2026-09-24 (ADR-058 / TSK-155)

> Entrega "Multiplicador de Origen por lejania" (Local / Nomada / Extranjero):
> el XP por acciones fisicas crece con la distancia REAL (haversine) del usuario
> al punto geografico de la accion, con curva escalonada por tier de origen
> (Local x1.00 / Nomada top 1.20 a 1000 km / Extranjero top 1.40 a 3000 km).
> Decision: **ADR-058** en DECISIONS.md (spec/migracion/codigo ALINEADOS).
> NO crea funciones serverless (**8/8 INTACTO**, ADR-001/ADR-010). Migracion
> NUEVA **038** (aditiva/idempotente/ASCII-safe) + seed geo.
> **APLICADA en Neon el 2026-09-24; seed cargado (1.122 ciudades / 245 paises).**

### TSK-155: Multiplicador de Origen por lejania (curve Local/Nomada/Extranjero) -- migracion 038 + seed geo + motor `mult_origen` + espejo SQL del Arbol + anti-teleport [IMPLEMENTADO / AUDITADO APTO PARA DEPLOY]

- **Estado:** IMPLEMENTADO EN WORKING TREE / AUDITADO APTO PARA DEPLOY (2026-09-24); verificado contra archivo real (ADR-006) y contra los smokes. Migracion 038 **APLICADA en Neon el 2026-09-24**; seed geo cargado (**1.122 ciudades / 245 paises**). Commit/deploy PENDIENTE. Cierra hallazgo de gobernanza **G-1 (drift documental)** de la auditoria.
- **Prioridad:** Alta (capa nueva de la economia de XP; migracion YA aplicada en Neon; queda deploy del backend v29/v30 + frontend).
- **Fecha:** 2026-09-24.
- **Origen:** decision de producto del operador: premiar la lejania real del viajero frente al punto de la accion, en reemplazo del bono plano x1.2 del ADR-028/WP-5.
- **ADR:** DECISIONS.md **ADR-058** (IMPLEMENTADO EN WORKING TREE / AUDITADO APTO PARA DEPLOY).
- **Responsable / agentes:** architect (diseno + ADR), backend-dev (`api/interacciones.js` v29/v30 + `api/usuarios.js` v22), sql-security/data-migration (migracion 038 + `scripts/seed_geo.js`), frontend-tpl (`index.html`/`usuario-session.js` badge origen + `mi-perfil.html` "Tu origen"), qa-auditor (smokes 058 + parity), docs-keeper (esta entrada de cierre).
- **Alcance REAL ejecutado (no el plan original si difiere):**
  1. **Migracion 038 (verificada contra el archivo real, ADR-006):** `db/migrations/038_origen_lejania.sql` (NUEVA, aditiva/idempotente/ASCII-safe ADR-008, 391 lineas, con PREFLIGHT read-only documentado en la cabecera): tablas `geo_ciudades` (columnas EXACTAS del seed real, PK `cod_mpio`, `es_capital` derivada) y `geo_paises` (centroides ISO-3166-1); `usuarios.origen_declarado_en` + backfill UNICO; `xp_ledger.mult_origen numeric(10,6) NOT NULL DEFAULT 1` + `xp_ledger.origen_tier text NULL` con CHECK idempotente; 7 claves en `gamificacion_config` (`factor_origen_local=1.0`, `factor_origen_nomada_max=1.2`, `factor_origen_extranjero_max=1.4`, `origen_km_local=25`, `origen_km_nomada=1000`, `origen_km_extranjero=3000`, `origen_min_dias_cuenta=7`). **APLICADA en Neon el 2026-09-24.**
  2. **Seed geo:** `scripts/seed_geo.js` (NUEVO) + `db/seeds/` (NUEVA carpeta: `geo_ciudades_raw.csv` DANE DIVIPOLA 2025 + xlsx de referencia, `geo_ciudades_seed.json`, `geo_paises_seed.json`, `geo_paises_raw.csv`, `README_GEO.md`). **Cargado en Neon: 1.122 ciudades / 245 paises.**
  3. **Backend `api/interacciones.js` v29/v30:** `mult_origen` como HERMANO de `stack_temp` dentro de `calcularXpFinal` (v29); resolucion server-side una vez por request (`resolverOrigenUsuario`); `normGeo` + espejo SQL `sqlNormGeo`; curva canonica `calcularFactorOrigen` + espejo SQL `sqlCurvaFactorOrigen`; v30 = **Arbol de Clases unificado**: BONO_ORIGEN x1.2 ELIMINADO y cada fila del Arbol eval\u00faa su punto con `sqlFactorFila` (PER-ROW). Ledger persiste `mult_origen`/`origen_tier`/`contexto.origen` (reintenta sin las columnas 038 si no corrio).
  4. **Backend `api/usuarios.js` v22:** perfil expone objeto aditivo `origen` (elegible/tier_base/`es_extranjero_verificado`/`dias_origen_declarado`/`min_dias_cuenta`); **ANTI-TELEPORT**: al cambiar `ciudad_base`/`pais_base` se fija `origen_declarado_en=NOW()` en el mismo UPDATE.
  5. **Backend `api/admin.js` v6 + `admin.html`:** `?recurso=salud_red` agrega 4 bloques aditivos de origen (distribucion_origen, mult_origen_stats, config_origen, alertas_origen; degrada 42703 si la 038 no corrio).
  6. **Frontend:** `index.html`/`usuario-session.js` (badge origen en sesion), `mi-perfil.html` (seccion "Tu origen").
- **Evidencia (ADR-006):** `db/migrations/038_origen_lejania.sql` (391 lineas); `scripts/seed_geo.js` + `db/seeds/` (1.122/245); `api/interacciones.js` header v29/v30 L1-18 (normGeo L314, sqlNormGeo L330, normGeoAlias L352, sqlAliasCiudad L379, calcularFactorOrigen L613, buscarCoordsCiudad L625, resolverOrigenUsuario L692, mult_origen L819-853, registrarXpLedger L959-975, sqlFactorOrigen L1922, sqlFactorFila L1943); `api/usuarios.js` header v22 L8-15; `api/admin.js` header v6 L42-48 + bloques L1089-1287; `scripts/smoke_058_origen_clasificador.js`; `scripts/smoke_origen_factor_parity.js`; spec `docs/superpowers/specs/2026-09-24-multiplicador-origen-lejania-design.md`; `git status`: todos untracked/modificados, SIN commit.
- **Smokes / verificacion:** `scripts/smoke_058_origen_clasificador.js` = **90/90 PASS** (sin BD, encadenado a `npm test`; script `smoke:origen:sinbd`) -- **RE-EJECUTADO en este pase**; `scripts/smoke_origen_factor_parity.js` = **111/111** contra Neon REAL (gate manual `npm run smoke:origen`; verificado por el operador a la aplicacion de la 038 en Neon, no re-ejecutable aqui sin credenciales); **`npm test` VERDE (14 smokes)**. Escudo GOLD: node --check OK, ASCII 0 en el codigo nuevo.
- **Relacion con bugs:** ninguno nuevo. **BUG-021/BUG-060** (patron migracion-antes-de-deploy) APLICAN: la **038 + seed** ya estan en Neon; el backend v29/v30 NO debe desplegarse sin ellas. **BUG-061** sigue ABIERTO (ajeno).
- **Pendiente operativo (BLOQUEANTE):** (1) **HECHO:** `db/migrations/038_origen_lejania.sql` APLICADA en Neon (2026-09-24) + seed geo cargado (1.122/245); (2) deploy del backend (v29/v30 + v22 + v6) y del frontend (`index.html`/`usuario-session.js`/`mi-perfil.html`/`admin.html`; sin cache-bust, `vercel.json` sirve todo `/(.*)\.js` con `no-store`). Orden: **038+seed en Neon (HECHO) -> backend -> frontend**.
- **Deuda aceptada [DEUDA]:** (a) `cap_global` puede absorber el premio en stacks altos; (b) curva duplicada JS/SQL con gate de paridad (111/111) como red de seguridad; (c) **NERF M-4:** usuarios sin `ciudad_base`/punto pasan de x1.2 a 1.00 (aceptado); (d) sin verificacion documental de nacionalidad (mitigacion: email + antiguedad + `alertas_origen` admin); (e) seed geo sin actualizacion automatica (DANE DIVIPOLA manual); (f) drift heredado 20->40 niveles (ADR-053).
- **Dependencia:** migracion 038 APLICADA en Neon + seed geo cargado (2026-09-24); ADR-058; ADR-053/ADR-028 (enmiendados por ADR-058).
- **Fuera de alcance:** NO crea funciones serverless (**8/8 INTACTO**); no toca la geocerca de ADR-024; no gatea el uso de consumibles; no implementa verificacion documental de nacionalidad.

## Prioridad PANTALLAS DE ENTRADA - 2026-09-24 (TSK-156) - adaptacion de `prompt mensaje.txt`

### TSK-156: Pantallas de entrada: overlay de bienvenida en index + registro.html dark dorado con referido + consulta publica `ref_info` [IMPLEMENTADO EN WORKING TREE / QA APTO CON OBSERVACIONES]

- **Estado:** IMPLEMENTADO EN WORKING TREE / QA APTO CON OBSERVACIONES (2026-09-24); verificado contra archivo real (ADR-006). Commit/deploy PENDIENTE.
- **Prioridad:** Alta (UX de primer acceso: onboarding de bienvenida y registro con invitacion por referido).
- **Fecha:** 2026-09-24.
- **Origen:** adaptacion de `prompt mensaje.txt` (Pantalla 1: bienvenida `/welcome`; Pantalla 2: registro/referido `/welcome-referred`), implementada por la sesion de desarrollo.
- **Responsable / agentes:** backend-dev (`api/usuarios.js` v23), lead/frontend-tpl (`registro.html` redisenado + `index.html` overlay), qa-auditor (Escudo GOLD + smokes), docs-keeper (esta entrada de cierre).
- **Alcance REAL ejecutado (no el plan original si difiere):**
  1. **`api/usuarios.js` v23 (bump real v22->v23):** NUEVA rama GET publica `?tipo=ref_info&ref=<codigo>` (~L666): devuelve `{ok:true, anfitrion_nombre}` (solo `usuarios.nombre` via `codigo_referido`, `trim` + `slice(0,80)`) o `{ok:false, error:'REFERIDO_INVALIDO'}` (HTTP 200, consulta suave, SIN JWT). No expone email, avatar, XP ni ids internos.
  2. **`api/interacciones.js`: SOLO anotacion-comentario** (~L6627, antes de `if (tipo === 'bonus_referido')`): las opciones del prompt alternativo (10% OFF hospedaje/tour, doble XP primer mes, insignia "Pionero Explorador") quedan como propuesta opcional FUTURA y NO se aplican; se mantiene el catalogo existente (`bienvenida_x2_24h`/`bienvenida_ascenso`/`bienvenida_fundador`). Sin logica nueva.
  3. **`registro.html` REDISEÑADO (~458 lineas, antes ~271):** silo `.reg-silo` a dark dorado, badge "Guia interactiva de turismo", banner de invitacion que consume `ref_info` mostrando el NOMBRE del anfitrion (nunca el codigo), selector de premios `fieldset#reg-bonos` con radio-cards desde `GET tipo=bonus_referido` (etiquetas REALES del catalogo), CTA "CREAR MI CUENTA Y RECLAMAR PREMIO", reclamo post-alta via `POST tipo=reclamar_bonus_referido` (solo si `perfil.bonus_referido===true` y premio elegido), conserva aviso REFERIDO_INVALIDO con boton "Continuar sin invitacion" (`#reg-skip-ref`), `loginConEmail`, redireccion index/mi-perfil, y `?nombre=` personaliza el h1.
  4. **`index.html` (+110 lineas):** overlay de bienvenida (Pantalla 1) con CSS scoped `.wl-*` y JS IIFE en `DOMContentLoaded`; flag localStorage `ec_welcome_visto` (1 sola vez); CTA "EXPLORAR LA WEB" (cierra + scroll a `#recs`) y enlace "Entrar" (solo cierra, modo demo sin sesion); `window.ExploraCO.abrirBienvenida` expuesto; z-index 10000 (debajo del bono-ref 10002 y expEra 10001, encima del login 9999).
- **Evidencia (ADR-006):** `api/usuarios.js` header real v23 (L16-18) + rama `ref_info` (L666-680); `api/interacciones.js` anotacion L6627-6631 + `if (tipo === 'bonus_referido')` L6632; `registro.html` (grep: `ref_info`/`#reg-bonos`/`#reg-skip-ref`/`reclamar_bonus_referido`); `index.html` (`.wl-overlay` L897 `z-index:10000`, `ec_welcome_visto` L4092, `abrirBienvenida` L4095, wiring DOMContentLoaded L4164, exposicion L4173); `scripts/smoke_ref_info.js` (untracked, 26 checks, **26/26 PASS** verificado con `node scripts/smoke_ref_info.js` en este pase); `package.json` (M, encadena el smoke al inicio de `npm test`). `git status` del lote: M `api/usuarios.js`, M `api/interacciones.js`, M `registro.html`, M `index.html`, M `package.json`, ?? `scripts/smoke_ref_info.js` -- los 6 SIN commit. Nota: `git status` muestra ademas `.opencode/agent/*.md` (M) y `opencode.json` (untracked) = config de opencode, NO parte de este lote. El release TSK-155/ADR-058 ya esta commiteado y pusheado (`e5a59f8` + `27784f8` = `origin/main`); este lote se monta encima en working tree.
- **Decision de producto:** los premios del prompt alternativo quedan como ANOTACION opcional futura (no aplicada); el selector de premios del registro consume el catalogo EXISTENTE de `bonus_referido` (ver DECISIONS.md "Nota de producto / decision" 2026-09-24).
- **Smokes / verificacion QA:** Escudo GOLD: sintaxis 4/4 PASS; ASCII 0 en `api/*.js` y bloques JS nuevos; divs `registro.html` 5/5 e `index.html` 390/390; contratos frontend<->backend coinciden; smokes `smoke_regalias_bono.js` 63/63, `smoke_016_multinivel_crowdsourcing.js` 52/52 y **`scripts/smoke_ref_info.js` (NUEVO, gate del contrato `ref_info`, 26 checks) 26/26 PASS** (re-ejecutado en este pase de docs, sin BD ni red). **Veredicto: APTO CON OBSERVACIONES.** Deuda preexistente documentada: bytes>127 historicos en texto UI visible de `registro.html` y motor viejo de `index.html` (NO introducidos por este lote). **ADR-006 (corregido en este pase): el gate `scripts/smoke_ref_info.js` EXISTE en el working tree** (untracked, 10.894 bytes, creado 2026-09-24 9:24:35; cubre ref valido/trim, alias `?codigo=`, slice(0,80), REFERIDO_INVALIDO en 4 casos, regresiones 400, estaticos 7a-7h con ASCII-safety del propio smoke) y **`package.json` (M, 2026-09-24 9:25:13) YA lo incluye al INICIO del script `test`** (antes de `smoke_gamificacion_v6.js`). El "mini-smoke ref_info 6/6" reportado por QA era una ejecucion previa/parcial; el gate final versionado cubre el contrato completo. Queda solo incluirlos en el commit del lote (untracked + M).
- **Relacion con bugs:** ninguno nuevo. **Deuda etiquetada (NO es bug nuevo):** `POST tipo=reclamar_bonus_referido` (preexistente) no exige `validarSesion` y deriva el dueno de `body.usuario_id` (IDOR preexistente, codigo 036); NO introducido por este lote; queda como deuda/nota de seguridad para la futura sesion `sql-security` (NO se registra en BUGS_HISTORICOS.md como bug nuevo).
- **Pendiente operativo (BLOQUEANTE):** (1) incluir `scripts/smoke_ref_info.js` (untracked) y `package.json` (M) en el commit del lote (el gate YA existe con 26/26 PASS y YA esta encadenado a `npm test`; no es reversionar, es commitearlos); (2) commit + push del lote (`api/usuarios.js`, `api/interacciones.js`, `registro.html`, `index.html`, `scripts/smoke_ref_info.js`, `package.json`; Vercel despliega al push; sin migraciones ni cache-bust, `vercel.json` sirve todo `/(.*)\.js` con `no-store`); (3) QA runtime post-deploy: overlay una sola vez, banner con NOMBRE del anfitrion con un codigo real, reclamo del premio post-alta y aviso REFERIDO_INVALIDO con "Continuar sin invitacion".
- **Deuda aceptada [DEUDA]:** (a) IDOR preexistente en `reclamar_bonus_referido` (escalado a `sql-security`); (b) bytes>127 preexistentes en UI visible de `registro.html` y motor viejo de `index.html` (heredados, no de este lote); (c) `scripts/smoke_ref_info.js` (untracked) y el cambio de `package.json` (encadenamiento a `npm test`) SIN commitear -- falta incluirlos en el commit del lote; (d) el enlace "Entrar" del overlay cierra sin abrir sesion (modo demo deliberado, sin sesion); (e) `<link>` a Geist SIN USAR en `registro.html:12` (carga de fuente muerta: el CSS `.reg-silo` usa `'Outfit'`/`'Barlow Condensed'` y el viejo `font-family:'Geist'` de `.reg-chip-code` fue reemplazado por Barlow) -- eliminar el `<link>` en una proxima sesion.
- **Dependencia:** `GET tipo=bonus_referido` + `POST reclamar_bonus_referido` preexistentes (sin cambios de contrato); `api/usuarios.js` v23.
- **Fuera de alcance:** NO crea funciones serverless (**8/8 INTACTO**, ADR-001/ADR-010); sin migraciones; sin ADR nuevo (decisiones de producto como nota en DECISIONS.md); no se aplican los premios alternativos del prompt.

#### Refinamiento 2026-09-24 (modo express) — ajuste de UI/JS sobre el lote TSK-156

- **Estado:** IMPLEMENTADO EN WORKING TREE / QA APTO CON OBSERVACIONES (2026-09-24, modo express); verificado contra archivo real (ADR-006). **NOTA DE REALIDAD (ADR-006):** el lote BASE de TSK-156 (`api/usuarios.js`, `api/interacciones.js`, `registro.html`, `index.html`, `package.json`, `scripts/smoke_ref_info.js`) YA fue COMMITEADO en `5181564` ("mensajes", = `origin/main`, verificado con `git show --stat 5181564`); el pendiente historico "incluir el smoke en el commit" quedo RESUELTO. Este REFINAMIENTO se monta encima y SI esta SIN commitear: `git status` = M `index.html`, M `registro.html`, M `usuario-session.js` (3 archivos).
- **Alcance REAL ejecutado (refinamiento):**
  1. **`index.html` (overlay de bienvenida):** descripciones de las 3 tarjetas `.wl-tip-desc` acortadas ("Descubre destinos y guarda tus favoritos." / "Suma puntos por cada reseña y visita." / "Cambia tus logros por beneficios reales."); **UN SOLO BOTON**: se ELIMINO `#wl-entrar` (boton "Entrar"); `#wl-cta` ahora dice **"ENTRAR"** y mantiene el comportamiento "cierra + scroll a `#recs`" (`cerrar(true)`); NUEVO enlace pequeno persuasivo `.wl-registro#wl-registro` → `/registro.html` (texto "Crea tu cuenta gratis con tu nombre y correo para comenzar") cuyo handler llama `marcarVisto()` y navega; CSS `.wl-entrar` renombrado a `.wl-registro` (+ `:focus-visible`).
  2. **`registro.html` (mensaje de referido):** DOS bloques informativos — `.reg-sub` (guia turistica interactiva) + NUEVO `.reg-sub2` (gamificacion); tag de invitacion mas sutil: se quito el icono SVG (`.reg-chip-ico`) y `.reg-chip-desc`; ahora es un tag inline (`reg-chip` + `.reg-chip-txt` "Invitación de" + `.reg-chip-code` con el nombre del anfitrion); NUEVA linea `.reg-bonos-intro` dentro de `fieldset#reg-bonos` ("Al unirte por invitación eliges uno de estos bonos de bienvenida:"); el fieldset sigue mostrandose SOLO con `?ref=` valido.
  3. **`usuario-session.js` (NUEVO archivo en el lote del refinamiento):** funcion `reclamarXpDemo()` (L958-969) llamada dentro de `loginConEmail` tras `sincronizarGuardados()` (L885). Limpia `localStorage.user_points` (XP de demostracion acumulado por `directorio-session.js` sin sesion, +5 por guardado) si `xp>0` y muestra toast "Tus puntos de exploración se sumaron a tu cuenta". El XP real entra por el replay de guardados de `sincronizarGuardados()`. Cubre AMBOS flujos de alta/login (`registro.html` y modal del navbar "Mi cuenta") porque ambos usan `loginConEmail`. Delta ASCII: **0 bytes>127 y 0 backticks nuevos** (verificado sobre las 23 lineas agregadas del diff).
- **Evidencia QA (ADR-006):** `node --check` 4/4 PASS; ASCII delta 0 (delta verificado en las 23 lineas agregadas de `usuario-session.js`: 0 bytes>127 / 0 backticks; el baseline preexistente del archivo es referencial); divs `index.html` **390/390** y `registro.html` **4/4**; residuos `wl-entrar`=0 y `reg-chip-desc/ico/copy`=0; smokes `smoke_directorio_session.js` **14/14** y `smoke_ref_info.js` **26/26**; contratos JS<->DOM intactos; `reclamarXpDemo` definida 1 vez (L958) / llamada 1 vez (L885). **Veredicto: APTO CON OBSERVACIONES.**
- **Observaciones NO bloqueantes:** (a) el CTA "ENTRAR" hace scroll a `#recs` (no login) mientras el enlace va a `/registro.html` — interpretacion de UX acordada; (b) ningun smoke ejercita `reclamarXpDemo()` ni el overlay (hueco de cobertura, propio de express); (c) tildes en texto HTML visible (permitido; ADR-002 aplica a `api/*.js`).
- **Deuda aceptada [DEUDA-EXPRESS]:** (1) SIN smoke que cubra `reclamarXpDemo()`/overlay; (2) `<link>` a Geist SIN USAR en `registro.html:12` (carga de fuente muerta); (3) cache-bust de `usuario-session.js` (BUG-073) SI aplica al deploy.
- **Relacion con bugs:** ninguno nuevo. La deuda IDOR preexistente en `reclamar_bonus_referido` (codigo 036) sigue vigente (ajena a este refinamiento).
- **Fuera de alcance:** NO toca `api/*.js` en el refinamiento (**8/8 INTACTO**); sin migraciones; sin ADR nuevo.

## Prioridad ORQUESTACION / ADR-067 - 2026-09-28 (deuda post tanda de coste)

> Cierre documental de la tanda ADR-067 (modelo de 3 capas con presupuesto:
> roster 40 -> 19, reglas R1-R4, convencion `description:`, `REFERENCIA-RUTEO.md`,
> 3 modos nuevos de `informe-cuota.js` y R3 forzado por `deny` explicito).
> SOLO gobernanza de orquestacion (`.opencode/**`, `opencode.json`,
> `scripts/ejecucion/informe-cuota.js`): NO toca `api/*` (**8/8 INTACTO**,
> ADR-001/ADR-010); sin migraciones. Bugs de configuracion: BUGS_HISTORICOS.md
> **BUG-085..BUG-088** (BUG-CONFIG-1..4).

### TSK-157: Deuda y verificaciones abiertas de la tanda ADR-067 [PENDIENTE]

- **Estado:** PENDIENTE (deuda registrada en el pase documental de cierre, 2026-09-28).
- **Prioridad:** Media (gobernanza de orquestacion; no bloquea produccion web).
- **Fecha:** 2026-09-28.
- **Origen:** cierre documental (R2) de la tanda ADR-067.
- **ADR:** DECISIONS.md ADR-067 (Nota de revision R-067).
- **Alcance (deuda concreta):**
  1. **(a) Verificar R3 en runtime [BUG-CONFIG-2 / BUG-086]:** reiniciar opencode y lanzar un subagente (p.ej. `js-silo-dev-free`) que intente `webfetch`; debe ser DENEGADO. La config de agentes/permisos se carga al INICIAR la sesion; la prueba de runtime no refleja el estado final del disco hasta reiniciar.
  2. **(b) Versionar `docs/orquestacion/REFERENCIA-RUTEO.md`:** esta untracked (matriz de dominios, R1-R4, anclas, politica de escalada).
  3. **(c) Revisar `explore-free`:** quedo con `edit: deny` y `bash: deny` (decision de menor privilegio); decidir si necesita `bash` read-only.
  4. **(d) Residual de ruta:** `scripts/informes-cuota/cuota-2026-09-11-desde-2026-09-06.md:199` cita la ruta vieja `scripts/informe-cuota.js`.
  5. **(e) Convencion ADR-067 fuera de `.opencode/`:** `.agents/skills/brainstorming/SKILL.md` tiene `description` en ingles y posiblemente >150 chars: decidir si entra en la convencion.
  6. **(f) `batch-create/SKILL.md`:** contiene el nombre de modelo "DeepSeek V4 Flash"; la convencion ADR-067 prohibe nombres de modelo en skills.
  7. **(g) URLs de thumbnail rotas [BUG-CONFIG-3 / BUG-087]:** URLs de 800px/1200px devuelven HTTP 400 y ya estan sembradas en HTML/JS; barrer y regenerar desde la API (`iiurlwidth`).
- **Evidencia (ADR-006):** `git grep -n "webfetch: allow" -- .opencode/agent/` -> solo `research-agent-free.md`; `git grep -c "webfetch: deny" -- .opencode/agent/` -> 18; `git grep -n "AGENTS\.md" -- .opencode/` -> 0; `git status --short` -> `docs/orquestacion/` untracked; salida de `node scripts/ejecucion/informe-cuota.js --overhead` (Capa 0 12.752 -> 4.134 chars; Total 145.616 -> 85.884 chars).
- **Relacion con bugs:** BUG-085..BUG-088 (BUG-CONFIG-1..4).
- **Fuera de alcance:** NO toca `api/*` (**8/8 INTACTO**); sin migraciones; no modifica `.opencode/**` desde este pase (solo lo documenta).
- **Dependencia:** ninguna (arranca en frio re-ejecutando `node scripts/ejecucion/informe-cuota.js --overhead`).

### TSK-158: Subida de medios con Vercel Blob (client upload) en todas las superficies [IMPLEMENTADO EN WORKING TREE]

- **Estado:** IMPLEMENTADO EN WORKING TREE / verificado local (2026-09-29, modo express); pendiente commit + prueba manual en produccion.
- **Prioridad:** Alta (bloquea la subida real de archivos).
- **Fecha:** 2026-09-29.
- **Origen:** peticion del usuario (subir imagenes, audio y video).
- **ADR:** DECISIONS.md ADR-068.
- **Alcance REAL ejecutado:**
  1. `package.json`: +`@vercel/blob@2.8.0`.
  2. `api/utilidades.js`: rama `?tipo=blob_upload` (client upload tokens); helpers `blobVerificarJwt`/`blobUpload`; 3 modos (admin/user/publico-destino); prefijo obligatorio; limites foto 5 / audio 15 / video 30 MB. **8/8 endpoints intacto.**
  3. NUEVO `media-upload.js`: `window.MediaUpload.{LIMITES,tipoDeArchivo,validar,subir}`; carga `@vercel/blob/client` desde `esm.sh@2.8.0`.
  4. `mi-perfil.html`: drop + picker en Museo, boton en +Agregar foto, portadas de album (crear/editar) y foto de perfil.
  5. `publicar.html`: foto principal (reemplaza base64/FileReader) + boton de subida a galeria.
  6. `admin.html`: botones de subida en hero, galeria y cartas (imagen).
  7. `.env.example`: `BLOB_READ_WRITE_TOKEN`.
- **Evidencia (ADR-006):** `node --check` 2/2; ASCII 0 bytes>127 en los 2 `.js`; divs mi-perfil 551/551, publicar 140/140, admin 1077/1077; inline scripts parsean (vm.Script); prueba local 7/7; smoke 036 media 93/93.
- **Deuda aceptada [DEUDA-EXPRESS]:** (a) subida anonima sin rate-limit propio (solo foto de destino, 5 MB); (b) `blobVerificarJwt()` duplicado; (c) CDN `esm.sh` en runtime; (d) marcadores de blog del admin siguen por URL.
- **Relacion con bugs:** ninguno nuevo.
- **Fuera de alcance:** sin migraciones de esquema (se reusa `foto_url`/`url`); sin tocar el resto de rutas de `utilidades.js`.
- **Dependencia:** store Blob conectado al proyecto en Vercel (`BLOB_READ_WRITE_TOKEN`).

### TSK-159: Bugs A1-A3 + Pasaporte/Billetera (042) + Subida v2 [IMPLEMENTADO EN WORKING TREE]

- **Estado:** IMPLEMENTADO EN WORKING TREE / `npm test` verde (2026-09-29); pendiente aplicar la migracion 042 en Neon + commit/deploy.
- **Prioridad:** Alta.
- **Fecha:** 2026-09-29.
- **Origen:** `prompt.md` de la sesion (4 fases: bugs, pasaporte/billetera, subida v2, cierre).
- **ADR:** DECISIONS.md ADR-069.
- **Alcance REAL ejecutado:**
  - **Fase A (bugs):**
    1. **A1** subida sin URL cruda: `media-upload.js` expone `confirmacion()` (miniatura + check SVG + peso, sin URL); `mi-perfil.html` reemplaza el texto de la URL en la foto de perfil por `pfDatoFoto` (miniatura) y usa la confirmacion; `publicar.html` (foto principal y galeria) y `admin.html` (admin conserva la URL + confirmacion).
    2. **A2** hidratacion de "Estuve aqui": causa raiz = `usuario-session.js estaVisitado()` comparaba `d.id`/`d.slug` contra el UUID, pero `?tipo=mapa` devuelve `d.id AS destino_id` (api/interacciones.js). Se normalizan las 3 claves. **BUG-089.**
    3. **A3** mapa base: NUEVO `mapa-tiles.js` (`window.MapaTiles.aplicar`, fallback CARTO voyager/positron -> OSM por `tileerror` + aviso con reintento); integrado en `mapa-cultural.js` (v1.1.1), `map-picker.js`, `index.html`, `comunidad.html` (OSM directo -> CARTO), `mapas.html`.
  - **Fase B (migracion 042):** `usuarios.fecha_nacimiento` (PII owner-only, editable 1 vez), `usuario_fotos` (tope 10 atomico), `billeteras` (identidad + agregador), `album_fotos.destino_id`. Backend `api/usuarios.js` **v24** (`perfil_actualizar` + `fecha_nacimiento`; `foto_agregar`/`foto_principal`/`foto_quitar`; GET `billetera_mia`). `api/interacciones.js`: logro `logr_pasaporte_completo` (tier plata, +200 XP via ledger canonico + `repartirXpReferidos`). UI `mi-perfil.html` (Pasaporte, billetera, galeria N/10, fecha). NUEVO `scripts/verify_042_precheck.js`.
  - **Fase C (subida v2):** `media-upload.js` optimiza en el navegador (canvas -> WebP q0.8, fallback JPEG; perfil 800 / resto 1600; EXIF `from-image`; elimina GPS; no amplia; GIF/SVG intactos). Bloque de subida above-the-fold en `mi-perfil.html`. Buscador de ubicacion (C4) en `mi-perfil.html` (`buscarDestinoAlbum` -> `/api/destinos?q=`) y `album_fotos.destino_id` en el INSERT de `album_agregar_foto` con fallback 42703.
  - **Fase D:** ADR-069, este TSK, BUG-089, NEXT/PROJECT/BLUEPRINT y `docs/DEPLOY_042.md`.
- **Evidencia (ADR-006):** `node --check` 6/6; ASCII 0 en `api/*.js` (utilidades.js: 3 `\\u` PREEXISTENTES en regex, no tocado); divs 0 en los 6 HTML; **`npm test` VERDE** (16 smokes) + `smoke_mapa_tiles.js` (21) + `smoke_042_pasaporte_billetera.js` (28). **8/8 endpoints intacto.**
- **Deuda [DEUDA-EXPRESS]:** canje/QR de billetera diferido (ADR-069); blob huerfano al reemplazar foto de perfil no se borra; `test_logros_catalogo.js` estaba desalineado (30 vs 33 reales) -> **BUG-090**; verificacion de edad 13 solo declarativa (monitoreo pendiente).
- **Fuera de alcance:** sin nuevos endpoints (8/8); QR de referidos (`api.qrserver.com`) NO se toco.

## Prioridad MAPA BASE (CARTO -> OSM) + TOOLING DE SUBAGENTES - 2026-09-29 (ADR-071 / BUG-091 / BUG-092 / TSK-161 / TSK-162)

> Cierre de dos incidentes del 2026-09-29: (A) los basemaps de CARTO devuelven
> HTTP 200 con un PNG placeholder y el mapa queda solo con pines (BUG-091); (B) los
> subagentes fallaban por el free tier de `opencode` (BUG-092). El fix de mapa no
> toca `api/*` (**8/8 INTACTO**); sin migraciones.

### TSK-161: Migracion del mapa base de CARTO a OSM + cadena de respaldo de 3 proveedores [CERRADA]

- **Estado:** CERRADA / CORREGIDO en working tree (2026-09-29); commit/deploy pendientes.
- **Prioridad:** Alta (incidente visible en produccion).
- **Fecha:** 2026-09-29.
- **Origen:** reporte del operador "el mapa cultural y los otros mapas no muestran la textura, solo los pines".
- **ADR:** DECISIONS.md ADR-071.
- **Bug:** BUGS_HISTORICOS.md BUG-091.
- **Alcance REAL ejecutado:**
  1. `mapa-tiles.js` L21-25: nueva cadena `osm` -> `osm-hot` -> `esri-imagery`; `UMBRAL_ERRORES` = 5; fallback por `tileerror` y aviso con boton Reintentar intactos.
  2. `mapa-cultural.js`: L71 `TILE_VOYAGER` -> OSM, L73 `ATTR_VOYAGER` -> OSM, comentario L1681.
  3. `index.html`: L1732, L1734, L1741 y L2291 `tiles: 'carto-voyager'` -> `'osm'`.
  4. `mapas.html`: L301 y L303-306.
  5. `comunidad.html`: L2043-2052.
- **Archivos tocados:** `mapa-tiles.js`, `mapa-cultural.js`, `index.html`, `mapas.html`, `comunidad.html`.
- **Evidencia (ADR-006):** `npm run test` **EXIT CODE 0** (13 smokes OK, 0 FAILs reales); `scripts/smoke_mapa_tiles.js` **24/24 PASS**; `scripts/smoke_mapa_cultural.js` **98/98 PASS** (assert A3 reescrito); Escudo GOLD APROBADO (`node --check` OK, 0 bytes >127 / 0 backticks en `mapa-tiles.js`, divs identicos a HEAD: index 388/388, mapas 58/58, comunidad 449/449; 0 `cartocdn` en los archivos tocados).
- **Deuda [DEUDA]:** (a) id legado `tiles: 'carto-voyager'` en `mapa-cultural.js:359` y `mymapa.js:152` (solo nombre, resuelve a `TILE_VOYAGER` = OSM); (b) **hallazgo ADR-006 no citado en el brief:** `map-picker.js:91` conserva la URL CARTO por defecto y la pasa como `custom` primero a `MapaTiles.aplicar` (L163/L254), por lo que el fallback no actua en el map-picker de `admin.html`/`mi-perfil.html`; (c) ~90 `.html` estaticos con `cartocdn` inline (p.ej. `casa-vieja-popayan.html`) fuera de alcance.
- **Fuera de alcance:** paginas de destino (`api/pagina-destino.js` usa iframe de Google Maps, no CARTO); `api/*` (8/8 INTACTO).
- **Dependencia:** ninguna.

### TSK-162: Fix del modelo de subagentes (free tier de `opencode`) [CERRADA]

- **Estado:** CERRADA (2026-09-29); requiere REINICIAR OpenCode para recargar los agentes.
- **Prioridad:** Alta (bloqueaba la orquestacion: ningun subagente respondia).
- **Fecha:** 2026-09-29.
- **Origen:** incidente de tooling del mismo dia.
- **Bug:** BUGS_HISTORICOS.md BUG-092 / BUG-CONFIG-5.
- **Alcance REAL ejecutado:**
  1. `.opencode/agent/*.md` (19 archivos): 18 pasaron a `opencode-go/deepseek-v4.1-flash`; `media-reader-free.md` paso a `opencode-go/mimo-v2.6-pro` (capacidad de vision).
  2. `opencode.json`: `small_model` paso de `opencode/big-pickle` a `opencode-go/deepseek-v4-flash`.
- **Archivos tocados:** `.opencode/agent/*.md` (19), `opencode.json`.
- **Evidencia (ADR-006):** recuento = 19 agentes, 18 x `deepseek-v4.1-flash` + 1 x `mimo-v2.6-pro`; `opencode.json` con `model: opencode-go/deepseek-v4.1-flash` y `small_model: opencode-go/deepseek-v4-flash`. Verificado tras reiniciar: los subagentes responden.
- **Nota:** proveedores autenticados en la maquina: solo `opencode-go` y `google`.

## Unificacion del panel de perfil (Pasaporte combinado de 10 datos) - 2026-09-29 (ADR-069 ENMIENDA 1 / TSK-163)

> Refinamiento de producto sobre TSK-159. Working tree (sin commit ni deploy);
> viaja con el release de la migracion 042, aun PENDIENTE de aplicar en Neon.
> No crea endpoints (**8/8 INTACTO**); sin migracion nueva.

### TSK-163: Unificar en un solo panel las secciones de datos del perfil (Pasaporte combinado de 10 datos) [IMPLEMENTADO EN WORKING TREE]

- **Estado:** IMPLEMENTADO EN WORKING TREE / verificacion verde (2026-09-29); commit/deploy PENDIENTES.
- **Prioridad:** Alta (producto: un solo panel de datos y una sola fuente de progreso del pasaporte).
- **Fecha:** 2026-09-29.
- **Origen:** refinamiento de producto sobre TSK-159 ("Unificar en un solo panel las secciones de datos del perfil").
- **ADR:** DECISIONS.md ADR-069 (ENMIENDA 1).
- **Precedente:** continua a TSK-159 (Pasaporte/Billetera, migracion 042).
- **Alcance REAL ejecutado:**
  - `mi-perfil.html` (tab perfil): se ELIMINAN los bloques `#pf-datos` ("Mis datos"), `#pf-origen` ("Tu origen"), `#pf-completa` ("Completa tu perfil"/"Tu pasaporte de viajero") y el titulo "Tu Pasaporte". Queda UN solo panel host id `pf-pasaporte` titulado "Tu pasaporte de viajero"; se conservan `#pf-billetera` y `#pf-galeria`.
  - JS de `mi-perfil.html`: se ELIMINAN `renderDatosPerfil`, `pfDato`, `pfDatoFoto`, `renderOrigen`, `pfOrigenDesdeSesion`, `pfOrigenRow`, `PF_MISION_DESTINO`, `PF_MISION_ORDEN` y `cargarCompletitudPerfil`. `renderPasaporte(p)` se REESCRIBE (con `PF_PAS_ACCION`, `pfPasValor`, `pfPasItem`) para pintar las 10 filas con accion por campo. `pfEditarCampo` separa 'ciudad' (solo `ciudad_base`) y 'pais' (solo `pais_base`). Se conserva `pfOrigenMinDias` (aviso anti-teleport). Init, `pfTab('perfil')`, `pfRefrescarPerfilPaneles` y el guardado de Casa ahora llaman `cargarBilletera()`.
  - `api/usuarios.js` **v25** (antes v24): `calcularPasaporte(u, nFotos)` devuelve **10 items combinados** en este orden: foto, nombre, nacimiento, ciudad, pais, bio (>=40), intereses (>=3), email, casa, faccion. El SELECT de GET `billetera_mia` se amplia con `avatar_url`, `bio`, `intereses`, `casa`, `faccion`.
  - `api/interacciones.js`: el logro `logr_pasaporte_completo` se alinea a los 10 datos (desc de "6 datos" a "10 datos" y `ctx.pasaporteCompleto()` con 10 criterios), para que insignia y pasaporte no se contradigan.
  - `scripts/smoke_042_pasaporte_billetera.js`: linea de version actualizada a v25.
- **Decisiones de producto del operador:** (a) el progreso del pasaporte es la UNION COMBINADA de los datos del pasaporte 042 + las misiones de perfil, con total unico de **10**; (b) un solo panel; (c) ciudad y pais se muestran/editan por separado y se OMITE del perfil la visualizacion del puntaje por Local/Nomada/Extranjero (el multiplicador ADR-058 sigue vigente en backend; solo se oculto su tarjeta).
- **Consecuencia de negocio:** el gate de creacion de billetera (`bmPasaporte.completo`) ahora exige los 10 datos (antes 6). Las billeteras ya creadas PERSISTEN (`INSERT ... ON CONFLICT DO NOTHING`).
- **Evidencia (ADR-006):** `npm test` completo OK (todos los smokes, incluidos 042 y 058); `node --check` de `api/usuarios.js` y `api/interacciones.js` OK; balance de `<div>` en `mi-perfil.html` 560/560 (diff 0); `api/*.js` ASCII-safe (0 bytes>127, 0 backticks); QA estatico (sandbox vm) confirmo mapeo 10/10, uso de `esc()` (sin XSS) y call-sites cableados. Cabecera real `api/usuarios.js` v25; `calcularPasaporte` devuelve 10 items; `logr_pasaporte_completo` desc "10 datos".
- **Deuda [DEUDA-EXPRESS]:** (1) CSS huerfano `.pf-datos`/`.pf-completa`/`.pf-origen` en `mi-perfil.html` (~110 lineas) tras eliminar sus hosts, mas el comentario de cabecera que los menciona; (2) `pfPasItem` cae a `PF_PAS_ACCION[id] || {}` y, ante un id de backend sin accion, pintaria un boton "undefined" (robustez defensiva pendiente); (3) GET `billetera_mia` no envuelve su SELECT en el fallback 42703/42P01 que si usan las consultas vecinas (pre-existente desde v24, agravado mientras la migracion 042 siga PENDIENTE de aplicar en Neon); (4) cosmetico: `pfPasValor` lee nombres/valores desde la sesion (localStorage); si un campo no esta hidratado puede verse vacio aunque el servidor marque "Listo".
- **Fuera de alcance:** sin endpoints nuevos (8/8 intacto); sin migracion nueva; no se toca el multiplicador de origen en backend (ADR-058).
- **Relacion con bugs:** ninguno nuevo (no se observo falla; los hallazgos quedan como deuda).

## Migracion de identidad ExploraCO -> LATAWEL (rebranding) - 2026-09-30 (ADR-073 / TSK-164)

> Migracion de identidad visible sobre la estructura actual. Working tree (sin commit
> ni deploy); NO crea endpoints (**8/8 INTACTO**); sin migraciones; sin cambios de esquema.
> Fuente: `logos/ADR-LATAWEL.md` (consolidada como ADR-073 en DECISIONS.md).

### TSK-164: Migracion de identidad ExploraCO -> LATAWEL (marca, paleta, tipografia, activos y dominio) [IMPLEMENTADO EN WORKING TREE]

- **Estado:** IMPLEMENTADO EN WORKING TREE / verificado (2026-09-30); commit/deploy PENDIENTES.
- **Prioridad:** Alta (identidad de marca del producto).
- **Fecha:** 2026-09-30.
- **Origen:** decision de producto del operador (PO) aprobando el manual `logos/07-MANUAL.md` v1.0 y los 4 PNG de `logos/`.
- **ADR:** DECISIONS.md ADR-073 (consolida `logos/ADR-LATAWEL.md`).
- **Bug:** BUGS_HISTORICOS.md BUG-093 (manifest PWA con tamanos declarados incorrectos).
- **Alcance REAL ejecutado (SOLO identidad; NO se redisenaron las 20 pantallas):**
  1. **Marca:** LATAWEL (mayusculas, una palabra); tagline "What to do?"; descriptor "plataforma de turismo interactivo".
  2. **Dominio:** `https://latawel.com` VIVO (resuelve y sirve en Vercel; el antiguo `exploraco.co` YA NO resuelve). `BASE = process.env.SITE_BASE_URL || 'https://latawel.com'` en `api/pagina-destino.js` y `api/utilidades.js`; canonical, `og:url`, `og:image` absoluta, `sitemap.xml` y `FROM_EMAIL` a `latawel.com`.
  3. **Paleta (todo el sitio):** `#E8A020`->`#FF4A00`, `#C8860A`->`#FFB84D`, `#FDF3E0`->`#E5E7EB`, `#ffb400`->`#FF4A00`, `rgba(232,160,32)`->`rgba(255,74,0)`, `#111`->`#0F1419`, `#0A1628`->`#0F1419`.
  4. **Tipografia:** Poppins SOLO marca/tagline; se CONSERVAN Barlow Condensed + Outfit en texto.
  5. **Assets (`assets/brand/`):** `latawel-logo-horizontal.png` (240x80) + `@2x` (480x160) + `latawel-logo-horizontal-white.png` (240x80, fondo oscuro), `latawel-logo-vertical.png` (240x288) + `@2x`, `latawel-simbolo.png` (1277x1232), `latawel-lockup.png` (2172x724), `favicon/favicon-16/32/180.png` + `favicon.ico` (multi 16/32/48), `og/latawel-og-1200x630.png` (1200x630). Script reproducible `scripts/assets/build-brand-assets.ps1`. NO hay SVG maestro (solo 4 PNG en `logos/`); deuda aceptada.
  6. **Re-skineo masivo:** `scripts/rebrand/codemod-latawel.js` (dry-run/`--apply`) aplicado a **122 HTML de la raiz** (118 publicos + 4 fragmentos); auditoria `scripts/rebrand/audit-latawel.js`.
  7. **Logo por IMAGEN (no texto CSS):** header oscuro y footer/otros oscuros usan la variante white.
  8. **Head:** favicons + `og:image` default `https://latawel.com/assets/brand/og/latawel-og-1200x630.png`; canonical/`og:url` a `latawel.com`; `theme-color #FF4A00`.
  9. **Backend/otros:** `api/pagina-destino.js` (motor primario por rewrite), `api/utilidades.js` (sitemap/`BASE`/OG), `api/usuarios.js` (niveles "Gran Maestro LATAWEL"/"Mito Eterno LATAWEL"; `FROM_EMAIL 'LATAWEL <noreply@latawel.com>'`), `api/admin.js` (`FROM_EMAIL` + `ADMIN_EMAIL` fallback `admin@latawel.com`), `api/interacciones.js`; `pagina-destino.js` legacy (codigo muerto), conectores JS (`usuario-session.js`, `compartir.js`, etc.), `_motor.css`, `_premium.css`, `mapa-cultural.css`, `manifest.json`, `robots.txt` (sitemap -> `latawel.com`).
- **PRESERVADOS intactos (prohibido reemplazar):** `window.ExploraCO`, `window.onExploraCOUpdate`, `'exploraco12345'`, `'exploraco-share-style'`, `exploraco.vercel.app`, nombres de archivo `.html`, endpoints `/api/*`, esquema DB y tags JSONB.
- **Evidencia (ADR-006):** `npm test` = **896 PASS / 0 FAIL (exit 0)**; `node --check` OK en **24 archivos**; **0 regresiones de balance de divs** en **123 HTML**; balance de llaves CSS **0**; `grep` de la paleta legacy = **0 restos**; **154 archivos modificados** (git status). Verificado en archivo real: `assets/brand/` con las 9 rutas; `manifest.json`/`robots.txt`/`index.html` con `latawel.com` y `theme-color #FF4A00`; `BASE` con fallback; `FROM_EMAIL` LATAWEL; niveles LATAWEL en `api/usuarios.js`.
- **Deuda [DEUDA]:** (a) sin SVG maestro -> favicon/OG son raster; a 16px el isotipo puede perder detalle; (b) `manifest.json` declara `latawel-simbolo.png` como `192x192` y `512x512` cuando mide 1277x1232 (**BUG-093**); (c) acentos dorados funcionales fuera de la paleta en algunas paginas (`#FDE68A`, `#F59E0B`, `#FFD980`, `#FFD700`, etc.) como deuda de pulido; (d) filas historicas en `chat_mensajes` con nombre "ExploraCO Oficial" se CONSERVAN (Cero Borrado Logico); (e) `scripts/test-fase1.js` duplicado en `scripts/` con `console.log` viejo; (f) los scripts `scripts/seed-*.js` y helpers conservan `exploraco.co` (User-Agents/prints) fuera del codemod.
- **Acciones pendientes:** (1) config de `SITE_BASE_URL` en Vercel si existe con el valor viejo; (2) re-scrape manual de OG tras el deploy; (3) Google Search Console con el sitemap nuevo (`https://latawel.com/sitemap.xml`); (4) reemplazo futuro de los raster por SVG maestro; (5) corregir `manifest.json` (BUG-093).
- **Fuera de alcance:** rediseno de las 20 pantallas del prompt (deuda visual aceptada); renombrado de identificadores tecnicos/codename `exploraco`; endpoints nuevos; migraciones.
- **Dependencia:** ninguna.

## Restauracion de la capa gratuita de agentes - 2026-09-30 (ADR-074 / TSK-165)

> Gobernanza de coste de orquestacion (`.opencode/agent/*.md`, `opencode.json`,
> `scripts/ejecucion/verificar-capa-gratis.js`, `package.json`). NO toca `api/*`
> (**8/8 INTACTO**, ADR-001/ADR-010); sin migraciones. Bug de gobernanza:
> BUGS_HISTORICOS.md **BUG-094** (premisa incompleta de BUG-092).

### TSK-165: Restaurar la capa gratuita de agentes -- modelo de 3 capas y guard de coste [IMPLEMENTADO EN WORKING TREE]

- **Estado:** IMPLEMENTADO EN WORKING TREE / verificado (2026-09-30); commit/deploy PENDIENTES; requiere REINICIAR OpenCode para recargar los agentes.
- **Prioridad:** Alta (gobernanza de coste: la capa gratuita estaba vacia y todo el roster corria a pago).
- **Fecha:** 2026-09-30.
- **Origen:** hallazgo al medir modelos free como subagente (la premisa de BUG-092 era incompleta).
- **ADR:** DECISIONS.md ADR-074 (el guard y el brief lo rotulan "ADR-072"; el consecutivo real es 074 porque 072 y 073 ya existen).
- **Bug:** BUGS_HISTORICOS.md BUG-094 (BUG-092 permanece CERRADO; su resolucion queda supersedida).
- **Precedente:** ADR-067 (modelo de 3 capas con presupuesto, roster 40 -> 19); BUG-092 (el incidente de tooling que lo vacio).
- **Alcance REAL ejecutado:**
  1. `opencode.json`: `"model"` y `"small_model"` de `opencode-go/deepseek-v4.1-flash` / `opencode-go/deepseek-v4-flash` a `opencode/space-bunny-free`.
  2. 17 subagentes `*-free`: se QUITA la linea `model:` del frontmatter (heredan el modelo de su primario).
  3. `free-build`/`free-plan`: `model:` -> `opencode/space-bunny-free` + bloque "Capa de coste (ADR-074)" + regla R5.
  4. NUEVOS primarios `paid-build`/`paid-plan` (`opencode-go/deepseek-v4.1-flash`); `hybrid-build`/`hybrid-plan` (`opencode/space-bunny-free`; `hybrid-build` es el UNICO que puede proponer un `-pro` y NUNCA lo invoca sin OK explicito del operador, bloque `ESCALADO PROPUESTO`).
  5. NUEVOS 4 pines `-pro`: `backend-dev-pro`, `architect-pro`, `renderer-dev-pro`, `data-migration-pro` (todos `opencode-go/deepseek-v4.1-flash`).
  6. NUEVO guard `scripts/ejecucion/verificar-capa-gratis.js`: exit 1 si un `*-free` queda en modelo de pago; si `opencode.json` no esta en la allowlist FREE; si un `-pro` no declara `model:`; o si alguien usa un modelo de la lista ROTOS.
  7. `package.json`: `test` empieza por el guard; nuevos scripts `coste:gratis` (el guard) y `cuota:tanda` (`informe-cuota.js --task`).
- **Roster:** 19 -> **27** agentes (21 gratis, 6 de pago).
- **Evidencia (ADR-006):** conteo real = 27 agentes (17 `*-free` sin `model:` + `free-build`/`free-plan`/`hybrid-build`/`hybrid-plan` x `opencode/space-bunny-free` + `paid-build`/`paid-plan` y los 4 `-pro` x `opencode-go/deepseek-v4.1-flash`); `opencode.json` con `model`/`small_model` = `opencode/space-bunny-free`; `npm test` **VERDE (exit 0)** con el guard como primer paso; `opencode run --agent hybrid-build` delego a `@exp-pickle-free` y la DB registro ambos en `opencode/space-bunny-free` con `cost=0.000000`; guard forzado a `seo-dev-free` en pago -> **exit 1** correcto (revertido).
- **Deuda [DEUDA]:** (a) allowlist FREE / lista ROTOS dependen del proveedor (re-verificar, TSK-167); (b) los comentarios del guard citan "ADR-072" (renombrar, fuera de este pase); (c) sin medicion de calidad de los modelos free en dominios duros (TSK-166).
- **Fuera de alcance:** `docs/orquestacion/REFERENCIA-RUTEO.md` (ya actualizado por la tanda); `api/*` (8/8 INTACTO); sin migraciones.
- **Dependencia:** ninguna (arranca en frio re-ejecutando `npm run coste:gratis`).

### TSK-166: Medir la calidad real de `opencode/space-bunny-free` en dominios duros [PENDIENTE]

- **Estado:** PENDIENTE.
- **Prioridad:** Media (valida que el ahorro no cueste mas reintentos).
- **Fecha:** 2026-09-30.
- **Origen:** seguimiento de TSK-165 / ADR-074.
- **ADR:** DECISIONS.md ADR-074.
- **Alcance:** tras ~2 semanas de uso del modelo free, comparar calidad y coste free vs pago en los dominios duros (backend, frontend, renderer) sobre `opencode.db`: numero de reintentos, smokes en verde a la primera y coste por tarea completada. Criterio de decision: si el free multiplica los reintentos hasta anular el ahorro, escalar esos dominios a un pin `-pro` de forma selectiva (enlaza con TSK-168).
- **Evidencia (ADR-006):** baseline de economia por mensaje en ADR-074 (frontend-tpl 106x, qa-auditor 16x, backend-dev 12x, explore 7x).
- **Fuera de alcance:** no cambia agentes por si sola; solo mide y decide.

### TSK-167: Revisar la allowlist FREE / lista ROTOS ante cambios del proveedor [PENDIENTE]

- **Estado:** PENDIENTE.
- **Prioridad:** Media (la capa gratuita depende de una allowlist medida que el proveedor puede cambiar).
- **Fecha:** 2026-09-30.
- **Origen:** seguimiento de TSK-165 / ADR-074.
- **ADR:** DECISIONS.md ADR-074.
- **Alcance:** cuando aparezcan modelos free nuevos (o cambie el free tier de `opencode`/`opencode-go`), re-sondearlos como subagente y anadir a la allowlist FREE los que registren `cost=0.000000`; retirar de la allowlist los que dejen de funcionar. Actualizar la allowlist/lista ROTOS del guard `scripts/ejecucion/verificar-capa-gratis.js`.
- **Evidencia (ADR-006):** sondeo inicial en ADR-074 (3 FREE / 7 ROTOS).
- **Fuera de alcance:** `google/*` NO entra (key con billing: `gemini-3.5-flash-lite`/`gemini-flash-lite-latest` cobran; `gemini-2.5-flash-lite` retirado).

### TSK-168: Evaluar si conviene un pin `-pro` para los dominios SEO y admin [PENDIENTE]

- **Estado:** PENDIENTE.
- **Prioridad:** Baja (decision de coste/calidad; no bloquea).
- **Fecha:** 2026-09-30.
- **Origen:** seguimiento de TSK-165 / ADR-074 (hoy solo hay pins `-pro` para backend, architect, renderer y data-migration).
- **ADR:** DECISIONS.md ADR-074.
- **Alcance:** evaluar, con los datos de TSK-166, si el dominio SEO (`seo-dev-free`) o el admin (`admin-dev-free`) justifica un pin `-pro` de pago; en caso afirmativo crear `seo-dev-pro`/`admin-dev-pro` con `opencode-go/deepseek-v4.1-flash` y declarar el pin. Decidir si se anaden mas pines `-pro` o se conservan solo los 4 actuales.
- **Evidencia (ADR-006):** pines `-pro` actuales = `backend-dev-pro`, `architect-pro`, `renderer-dev-pro`, `data-migration-pro`.
- **Fuera de alcance:** no crea pines por si sola sin la decision del operador.

## Control de pantalla completa de mapas + limpieza y reorden del home - 2026-09-30 (TSK-169)

> UI/estilos de frontend (`index.html`, `admin.html`) + NUEVO `mapa-fullscreen.js` en la
> raiz. NO toca `api/*` (**8/8 INTACTO**, ADR-001/ADR-010); sin migraciones; sin tocar los
> motores compartidos `mapa-cultural.js`/`map-picker.js`. Commiteado y pusheado; working
> tree LIMPIO (`main` == `origin/main` = `d4ab733`). Bugs corregidos:
> BUGS_HISTORICOS.md **BUG-095** y **BUG-096**. Decision: DECISIONS.md **ADR-075**.

### TSK-169: Control compartido de pantalla completa de mapas + limpieza CSS y reorden/responsive del home [COMPLETADA]

- **Estado:** COMPLETADA / COMMITEADA Y PUSHEADA (2026-09-30); `main` == `origin/main` = `d4ab733`.
- **Prioridad:** Media (UI/UX de frontend; no toca runtime de datos).
- **Fecha:** 2026-09-30.
- **Origen:** necesidad de pantalla completa en los mapas (home y admin) y limpieza/reorden de la home.
- **ADR:** DECISIONS.md ADR-075 (control compartido de pantalla completa fuera de los motores de mapa).
- **Bugs:** BUGS_HISTORICOS.md BUG-095 (modal `map-picker` no abria) y BUG-096 (drawer invisible en pantalla completa).
- **Alcance REAL ejecutado (5 sub-tandas en una sola tanda):**
  1. **NUEVO `mapa-fullscreen.js` (raiz, 271 lineas):** IIFE ES5 ASCII puro; expone `window.MapaFullscreen` + `module.exports` con `attach({target, mapEl, getMap, label})`; idempotente por target; boton inyectado ARRIBA-DERECHA DENTRO del contenedor (arriba-izquierda la ocupa el zoom de Leaflet, abajo-derecha la atribucion); Fullscreen API nativa + fallback por clase CSS `.mfs-pseudo` (position:fixed al viewport) para navegadores sin la API (iPhone Safari); llama `map.invalidateSize()` al entrar y salir porque el motor del mapa NO observa el tamano del contenedor; iconos `\u26F6` (expandir) / `\u2715` (cerrar); cierra con ESC y con el boton; 44px tactil en <=860px; `aria-label`/`aria-pressed`; listeners `fullscreenchange`/`keydown` retirados en `destroy()`.
  2. **`index.html`:** `<script src="mapa-fullscreen.js?v=1">`; `id="mapa-map-container"` al contenedor; `initMapaFullscreen()` enganchado en `initMapaSection()`.
  3. **`admin.html`:** mismo script `?v=1`; control en los DOS mapas (`esb-mini-map-wrap` y `map-picker-el`) cableado a `MapPicker.getMiniMap()`/`MapPicker.getPickerMap()`; el mini-mapa se envuelve en un wrapper `position:relative` porque `map-picker.js` limpia el `innerHTML` del contenedor al (re)inicializarlo y habria borrado el boton.
  4. **Limpieza de CSS muerto en `admin.html`:** `.esb-mini-map` activada (150px -> 160px; el div no tenia la clase, se le puso y se quitaron los estilos inline duplicados); 6 reglas `.mpm-*` RETIRADAS (0 elementos las usaban); `.editor-sidebar-wrap` -> `.editor-sidebar` en el media query de 900px (el selector no coincidia con la clase real); selectores truncado `.dashboard-` y huerfano `.ws-` RETIRADOS; se retiro el parche muerto `#map-picker-modal[style*="flex"]`.
  5. **Reorden y responsive del home (`index.html`):** `#mapa-section` movido a inmediatamente despues del hero (orden final: hero -> MAPA -> Destacados -> Agenda -> CTA "Publicar mi lugar" -> Inspirate; movido con anclas por regex, delta de bytes = 0); mobile <=860px con `.mapa-map-container{order:1}` y `.mapa-list-panel{order:2}`, lista colapsada con boton `EXPLORAR LUGARES` + chevron que despliega con `.open` (max-height 340px, scroll interno) via `toggleMapaLista(btn)` con `aria-expanded`; banner `.ctab` en <=760px en columna (padding 22px -> 14px).
  6. **Filtros del mapa estilo Google Maps (`index.html`):** `.mapa-filters` salio del `.mapa-topbar` y vive DENTRO de `.mapa-map-container` como barra de chips superpuesta (`position:absolute;top:10px;left:52px;right:58px;z-index:900`, una sola fila con scroll horizontal); efecto doble: los filtros SI se ven en pantalla completa y dejan de consumir altura del mapa; `.mf-btn` a pildoras (`border-radius:999px`, 11px, sin `uppercase`, fondo oscuro translucido con texto blanco); `.mapa-filters .mf-loc` con `margin-left:0` y hover corregido.
  7. **Modulo `bands` ELIMINADO del home (`index.html`):** era redundante con los mismos 4 filtros ya presentes en el hero (`.hcat`), el mapa (`.mf-btn[data-cat]`) y Destacados (`.dc-btn`); se quitaron sus 3 capas (markup `<div class="bands" id="bands">` + 4 tarjetas; CSS del bloque BANDS + reglas `.bands`/`.band` del media query de 600px; los 2 hooks JS: bucle `.band` dentro de `syncAll()` y listener de click de `.band`) + `.band-new` (2 lineas CSS con 0 usos). Los otros tres consumidores de `syncAll()` quedaron intactos. Divs del index: 388 -> **371** (los 17 divs del modulo).
- **Decision clave:** el control de pantalla completa NO se metio en los motores compartidos (ver ADR-075): meterlo en `mapa-cultural.js` rompe 8 asserts de `smoke_mapa_cultural.js` (el stub de `L` no tiene `L.control` y el stub de elemento no tiene `insertAdjacentHTML`; el `TypeError` lo traga el `catch` de `mapa-cultural.js:1919-1921` y se salta `bindCategories`/`bindList`/`renderMarkers`).
- **Evidencia / verificacion (ADR-006):** working tree LIMPIO; `git log` = `cbd33e0` "mapa" (admin.html, index.html, mapa-fullscreen.js) -> `1b58f3a` -> `55a2f30` -> `d4ab733` = HEAD = `origin/main`; `npm test` **EXIT 0** (verde, incluye `smoke_mapa_cultural` y `smoke_mapa_tiles`); `node scripts/express_check.js index.html` PASS divs **371/371** (verificado en este pase); `npm test` VERDE; `verificar-capa-gratis.js` OK; `node --check mapa-fullscreen.js` OK, **0 bytes > 127 y 0 backticks** en el archivo nuevo.
- **Deuda [DEUDA-EXPRESS]:** (a) sin smoke para `mapa-fullscreen.js` ni para el drawer-en-fullscreen (verificado a mano); (b) la barra de chips captura el toque en la franja superior del mapa (~38px), puede molestar al arrastrar en mobile; (c) cambio de comportamiento en mobile del admin: al arreglar el selector, en <=900px el `.editor-sidebar` de 220px AHORA SI se oculta (antes la regla estaba muerta), requiere QA visual en dispositivo; (d) en pantalla completa el titulo del `.mapa-topbar` NO se ve (esta fuera del contenedor): intencional (estilo Google Maps), anotado; (e) `.mapa-filters` pasa a overlay: revisar contraste de los chips sobre tiles claros si cambia el tema del mapa; (f) el cache-bust `?v=1` de `mapa-fullscreen.js` es nuevo; si se edita el archivo hay que bumpearlo (patron BUG-073).
- **Fuera de alcance:** `api/*` (**8/8 INTACTO**); sin migraciones; `mapa-cultural.js` y `map-picker.js` NO se tocaron.
- **Dependencia:** ninguna.

## Roster unico de 20 agentes + `AGENTS.md` - 2026-10-01 (ADR-076 / TSK-170)

> Gobernanza de orquestacion SOLO (`.opencode/agent/`, `.opencode/skills/`, `opencode.json`,
> `package.json`, NUEVO `AGENTS.md` en la raiz). NO toca `api/*` (**8/8 funciones serverless
> INTACTAS**, ADR-001/ADR-010); sin migraciones de BD; sin cambios en produccion. Bugs
> cerrados: BUGS_HISTORICOS.md **BUG-034** y **BUG-088**.

### TSK-170: Roster unico de 20 agentes (sin pares espejo) + retiro de la ruta hibrida + `AGENTS.md` [CERRADA]

- **Estado:** CERRADA / IMPLEMENTADA EN WORKING TREE (2026-10-01); verificada contra los archivos reales; **commit PENDIENTE** (archivos nuevos sin commitear); requiere REINICIAR OpenCode para que los agentes recarguen (patron BUG-086).
- **Prioridad:** Alta (gobernanza de coste y de ruteo; es la base de todo `task` del proyecto).
- **Fecha:** 2026-10-01.
- **Origen:** el modelo de 3 capas de ADR-074 (27 agentes con pares espejo `*-free`/`*-pro` + ruta hibrida + ruta de pago propia) obligaba a elegir de un "~par" por dominio, clasificaba la capa por SUFIJO de nombre en vez de por la declaracion real, y dejaba el gasto de la ruta hibrida en manos de la disciplina del operador.
- **ADR:** DECISIONS.md ADR-076.
- **Bugs cerrados:** BUGS_HISTORICOS.md BUG-034 (validador canonico en `scripts/validate_ficha.js`) y BUG-088 (`AGENTS.md` creado en la raiz). BUG-092 solo REFERENCIADO (su premisa incompleta ya estaba anotada en ADR-074 / BUG-094); no se reabre (Cero Borrado Logico).
- **Alcance REAL ejecutado:**
  1. `.opencode/agent/`: **27 -> 20 archivos**. Los 16 `*-free` renombrados al nombre de dominio (agente unico por dominio); RETIRADOS los 4 `-pro`, `hybrid-plan`, `hybrid-build`, `paid-plan`, `paid-build`; `exp-pickle-free` **fusionado en `js-silo-dev`** (duplicaba dominio); NUEVOS `plan.md` y `build.md` (`mode: primary` SIN `model:` propio, heredan de `opencode.json`); los 16 especialistas declaran `model: opencode/space-bunny-free` explicito.
  2. **NUEVO `AGENTS.md` en la raiz** (antes no existia; BUG-088 lo reportaba): seccion 0 seleccion de tier obligatoria con `question` (una vez por tarea, sin default silencioso), seccion 1 matriz de 16 dominios con agente unico, seccion 2 capa de coste + gates de riesgo (RLS/esquema, migraciones/seeds masivos, motor de render, arquitectura/ADR exigen confirmacion explicita), seccion 3 16 reglas transversales, seccion 4 indice de skills.
  3. **Skills despublicadas** `batch-create`, `gemini-research`, `ingest-eventos` (14 -> 11 skills); recursos aprovechables conservados en NUEVO `.opencode/prompts/` (`GEMINI_MASTER_PROMPT.md`, `GEMINI_EVENTOS_PROMPT.md`, `GEMINI_GEMA_INVESTIGACION.md`, `ficha_template.md`); skills `create-dynamic-page` y `research-destination` reescritas al validador canonico (**cierra BUG-034**).
  4. **Skills nuevas portadas** de HostalTerraza: `anti-absorcion`, `eficiencia-recursos`, `templates`.
  5. **Scripts:** `scripts/ejecucion/verificar-capa-gratis.js` reescrito (clasifica por `mode`: PRIMARIO / ESPECIALISTA / PAID / ROTO, ya no por sufijo); NUEVOS `scripts/validate_ficha.js`, `scripts/usage_report.js`, `scripts/session_close.js`; `scripts/resolver-fotos-eventos.js` actualizado al validador canonico.
  6. `opencode.json`: `subagent_depth` de 2 a **1** y `permission.question: allow` anadido; `default_agent` sigue `free-build` y `model` sigue `opencode/space-bunny-free` (SIN cambios).
  7. `package.json`: nuevos `usage:tanda` (`scripts/usage_report.js --summary`) y `session:close` (`scripts/session_close.js`).
  8. `docs/orquestacion/REFERENCIA-RUTEO.md` reescrito con el roster de 20 sin espejo (NO editado en el pase documental; ya venia hecho).
- **Umbral de lectura por rango:** bajado de 200 KB a **150 KB**; por encima del umbral hoy: `api/interacciones.js`, `admin.html`, `mi-perfil.html`, `DECISIONS.md`, `TASKS.md`, `NEXT.md`, `BUGS_HISTORICOS.md`.
- **Evidencia (ADR-006, verificada en este pase):** `.opencode/agent/*.md` = **20**; `.opencode/skills/` = **11** directorios; `node scripts/ejecucion/verificar-capa-gratis.js` -> **`Agentes: 20 | gratis: 20 | de pago: 0`** con 4 PRIMARIO + 16 ESPECIALISTA y `RESULTADO: OK`; `Test-Path` True en `AGENTS.md`, `scripts/validate_ficha.js`, `scripts/usage_report.js`, `scripts/session_close.js`; `.opencode/prompts/` con los 4 recursos; `package.json` declara `usage:tanda` y `session:close`.
- **NO se toco `api/*` (8/8 funciones serverless INTACTAS); sin migraciones de BD; sin cambios en produccion; `index.html`, `admin.html` y el motor de render NO se tocaron** (por eso no se ejecuto Escudo GOLD: no hay `api/*.js` ni HTML en el lote).
- **Deuda [DEUDA]:** (a) **commit PENDIENTE** de todo el lote (incluye los archivos nuevos `AGENTS.md`, `scripts/usage_report.js`, `scripts/session_close.js`, `scripts/validate_ficha.js`, `.opencode/prompts/`, `plan.md`, `build.md` y los 3 directorios de skills nuevos); (b) `AGENTS.md` y `docs/orquestacion/REFERENCIA-RUTEO.md` deben viajar en el MISMO commit que el roster; (c) las 3 skills declaradas pendientes (`agentes-roster`, `modelos-verificados`, `reglas-de-oro`) NO existen: no invocarlas; (d) sin medicion de calidad real del FREE en dominios duros (TSK-166 sigue abierta) ni re-verificacion de la allowlist (TSK-167); (e) `subagent_depth: 1` impide que un subagente delegue; (f) TSK-166/TSK-167/TSK-168 quedan con premisa superada por este ADR (los pines `-pro` que evaluaban ya no existen).
- **Fuera de alcance:** `api/*` (**8/8 INTACTO**); `db/` (sin migraciones); produccion.
- **Dependencia:** ninguna (arranca en frio re-ejecutando `npm run coste:gratis`).

## Agrupacion plegable de items en "Mi perfil" (Museo / Guardados / Niveles / Mis Albumes) - 2026-10-02 (ADR-077)

> UI/UX **100% cliente**, modo express. Un solo fichero modificado: **`mi-perfil.html`**.
> NO se toca `api/*` (**8/8 funciones serverless INTACTAS**, ADR-001/ADR-010); sin migraciones;
> sin cambios en produccion. Objetivo de producto: eliminar el scroll eterno de las pestanas
> Perfil y Museo agrupando los items bajo cabeceras plegables.

### TSK-171: Agrupacion plegable de items en "Mi perfil" (4 superficies) [CERRADA]

- **Estado:** CERRADA / IMPLEMENTADA EN WORKING TREE (2026-10-02); verificada contra los archivos reales (ADR-006); **commit PENDIENTE**. Modo express.
- **Prioridad:** Media (UI/UX de frontend; no toca runtime de datos ni serverless).
- **Fecha:** 2026-10-02.
- **Origen:** el scroll eterno de "Mi perfil": las pestanas Perfil y Museo pintaban cientos de tarjetas en fila continua (hasta 200 recursos de Museo, hasta 50 albumes, 40 niveles y todos los guardados) sin ninguna jerarquia intermedia.
- **ADR:** DECISIONS.md **ADR-077** (invariante de composicion con `pfAplicarTab()`/`_pfDisp`; decision 3 de la tanda). Sin migracion y sin contrato de API nuevo.
- **Bug de proceso:** BUGS_HISTORICOS.md **BUG-097 / BUG-CONFIG-6** (cancelacion a mitad de un subagente `@js-silo-dev`; **NO es un defecto de producto**).
- **Alcance REAL ejecutado (un solo fichero, `mi-perfil.html`; +307/-56 lineas):**
  1. **Helper generico reutilizable `pfGruposRender()` / `pfGruposToggle()` / `_pfGruposAbiertos`** (`mi-perfil.html:3125-3185`). Firma: `pfGruposRender(gridId, items, claveDe, grupos, itemHTML)`. **Devuelve solo el string y NO toca el DOM** (los 3 llamadores lo pintan; Guardados necesita el string para el caso vacio del filtro de chips). El estado de plegado vive **FUERA del DOM**, indexado por `gridId + '|' + clave`, para que los re-renders (publicar, mover, eliminar) repinten conservando el grupo abierto y el usuario no pierda el grupo que estaba leyendo. Solo se pintan los grupos con items; las claves no previstas en el array de grupos se agregan al final **para no perder items**. `pfGruposToggle()` alterna la clase `pf-grupo-abierto`, el `aria-expanded`, el glifo de la flecha y el `display` inline del cuerpo.
  2. **Museo** (`#museo-recursos-grid`, hasta 200 items): `MUSEO_GRUPOS` / `museoGrupoClave()` (`mi-perfil.html:3298-3313`) y `museoRenderRecursos()` (`:3315-3327`). Agrupa por `m.media_type || m.foto_type || m.tipo_media` normalizado a `foto|video|audio` (el backend escribio el tipo en distintos campos segun la version), fallback `foto`; orden fijo foto/video/audio.
  3. **Guardados** (`#mis-guardados-media-grid`): `GUARDADOS_GRUPOS` / `guardadosGrupoClave()` (`mi-perfil.html:2801-2818`) y `misRenderListaGuardados()` (`:2824-2826`). 4 grupos por `m.fuente`, tomando como contrato la lista canonica del servidor `GUARDADO_FUENTES = ['album','album_foto','viajero_foto','curada']` (`api/interacciones.js:4786`, **NO modificada**); fallback `curada`. El agrupado se aplica **despues** del filtro por chip, asi que los grupos que quedan vacios ni siquiera se crean.
  4. **Niveles** (`#pf-niveles`, 40 niveles): `NIVELES_ERAS` (`:1582`), `nivelesGrupoClave()` (`:1593`), `nivelItemHTML()` (`:1599`), `pfNivelesAutoAbrirGrupo()` (`:1644-1653`) y `renderNiveles()` (`:1655-1671`). 5 grupos (`Caminante`, `Explorador`, `Cronista`, `Leyenda`, `Mito`) por `n.era`, fallback Caminante. Los grupos **envuelven** el acordeon por nivel, no lo sustituyen: abrir un grupo solo muestra sus `.nivel-item` y cada nivel sigue plegado hasta que el usuario pulse su cabecera (`toggleNivelDetalle`); `_nivelesAbiertos` y `_pfGruposAbiertos` son estados separados, asi que abrir un grupo NO fuerza a expandir los demas niveles. `pfNivelesAutoAbrirGrupo()` abre en el PRIMER render el grupo del nivel actual y **no sobreescribe una decision posterior** del usuario (sentinela `_pfNivelesGrupoAuto` + guarda `est === true || est === false`).
  5. **Mis Albumes** (`#mis-albumes-grid`, hasta 50): `MIS_ALBUMES_VER_MAS = 24` (`:2450`), `misAlbumesToggleVerMas()` (`:2466`) y `misAlbumesPintar()` (`:2482-2511`). **NO se agrupa:** un album no tiene `media_type`, luego no hay clave de grupo que derivar. Muestra 24 y oculta el resto tras un boton con contador ("Ver mas albumes (+N)"); si hay 24 o menos **no se pinta el boton**. Las tarjetas ocultas **permanecen en el DOM con `display:none`** (ADR-003, Cero Borrado Logico) para que el toggle solo tenga que mostrar u ocultar.
  6. **CSS: silo atomico bajo `#profile`** (Regla de Oro 4 / ADR-004) en `mi-perfil.html:611-652`: `.pf-grupo`, `.pf-grupo-abierto`, `.pf-grupo-btn`, `.pf-grupo-flecha`, `.pf-grupo-nombre`, `.pf-grupo-count`, `.pf-grupo-body`, mas `@keyframes pfGrupoGiro` y el apagado por `prefers-reduced-motion`. La custom property `--pf-grupo-col` se declara **solo bajo `#profile`** (`:623-625`, mas la media query `:611`) y es la **fuente unica de verdad** del ancho de tarjeta, heredada por `.pf-grupo-body` (`:650`); el ritmo entre grupos lo sigue gobernando el `gap` del anfitrion. **NO se declara `display` en `.pf-grupo-body`**: lo alterna inline `pfGruposToggle()` (`grid | none`), porque el patron equivalente (`toggleTrofeosBloqueados()`) no usa CSS de estado.
- **Decisiones de diseno de la tanda:**
  1. **Todo plegado al entrar**, por peticion explicita del usuario.
  2. **Se replico el patron ya existente de `toggleTrofeosBloqueados()`** (`mi-perfil.html:1756`, boton en `:1792`) en vez de inventar uno nuevo: sin `details/summary`, sin librerias (ADR-001).
  3. **NO se toco `pfAplicarTab()` / `PF_TABS`** (`mi-perfil.html:5449` y `:5456-5465`, ADR-028). Es una **trampa real**: `pfAplicarTab` cachea `_pfDisp` una sola vez (`:5463`), asi que un collapsible con `display:none` sobre un bloque `data-tab` queda cacheado como `''` y **reaparece al cambiar de pestana**. Por eso los wrappers `.pf-grupo` van **SIEMPRE dentro del grid** y nunca como hijos directos de `#profile`, y **ningun wrapper lleva `data-tab`**. La regla normativa completa esta en **ADR-077**.
  4. **Presupuesto Vercel Hobby 8/8 agotado** (verificado en este pase: 8 ficheros en `api/`, 0 margen): se respeto, cero endpoints nuevos, agrupacion 100% en cliente.
  5. **ASCII-safe (ADR-002)** en todo lo nuevo (verificado en este pase documental).
- **Evidencia / verificacion (ADR-006, medida en este pase documental):**
  - `node scripts/express_check.js mi-perfil.html` -> **PASS**, divs **563=563**.
  - `node scripts/smoke_016_multinivel_crowdsourcing.js` -> **52/52 PASS** (incluye D15a: `mi-perfil.html` divs balanceados, diff 0).
  - `node scripts/smoke_test_gamificacion_v4.js` -> **97/97 PASS** (40 niveles intactos).
  - `node scripts/smoke_niveles_data.js` -> **OK, 31 verificaciones**; `node scripts/smoke_042_pasaporte_billetera.js` -> **OK**.
  - Auditoria de `@qa-auditor`: **APTO CON OBSERVACIONES**, 86 aserciones ejecutando el codigo real en `vm`. **Sin perdida de items**: Museo 200/200, Guardados 25/25, Niveles 40/40, Albumes 25/25 (24 visibles + boton). Cero regresiones nuevas. Los 5 hallazgos (1 MEDIA + 4 BAJA) quedaron resueltos y verificados.
  - ASCII (ADR-002): las **308 lineas anadidas** tienen **0 bytes > 127 y 0 backticks** (medido sobre `git diff -U0`). El fichero completo conserva un residuo **preexistente** de 200 bytes > 127 y 4 backticks, que en HEAD eran **446** y **4**: esta tanda no introduce ninguno y ademas reduce el primero.
- **NO se toco `api/*` (8/8 funciones serverless INTACTAS); sin migraciones de BD; sin cambios en produccion; `index.html`, `admin.html`, `usuario-session.js` y los motores de render NO se tocaron.** Unico fichero de codigo modificado en el repo: `mi-perfil.html`.
- **Deuda [DEUDA-EXPRESS] (preexistente, NO atribuible a esta tanda):**
  (a) `scripts/express_check.js`: **26 FAIL globales** en `scripts/*` y `api/utilidades.js` por backticks y doble escape (`api/utilidades.js` -> backticks=24 en las lineas 158, 159, 204, 205, 226, 229, 233, 233; doble-escape=3 en 654, 723, 723);
  (b) `scripts/smoke_test_epic_prompt.js`: **4 FAIL** (VOCACIONES x3, `vocaciones_catalogo` x2, `chat_salas`) contra `api/interacciones.js`;
  (c) **CSS duplicado preexistente**: `.pf-museo-preview` declarado dos veces (`:511` y `:592`) y `.trofeo-grid` dos veces (`:127` y `:174`); se dejo intacto a proposito;
  (d) `.pf-album-card` y `.pf-ver-mas` siguen con peso visual en estilos inline (por coherencia con el patron de Trofeos); el silo solo aporta foco de teclado y `cursor` (`:629-631`);
  (e) `mi-perfil.html` conserva el residuo ASCII de (a)/(c): 200 bytes > 127 y 4 backticks heredados de HEAD (446/4).
- **Fuera de alcance:** `api/*` (**8/8 INTACTO**); `db/` (sin migraciones); produccion.
- **Dependencia:** ninguna (arranca en frio; la agrupacion es puramente de presentacion).

## Prioridad PERMISOS TOTALES + ECONOMIA DE TURNOS + SMOKE PERMANENTE de grupos - 2026-10-02 (ADR-078 / TSK-172)

> Gobernanza de orquestacion + 1 script de test. NO toca `api/*` (**8/8 funciones serverless
> INTACTAS**, ADR-001/ADR-010); sin migraciones de BD; sin cambios en produccion. Bug de
> instrumentacion cerrado: BUGS_HISTORICOS.md **BUG-098 / BUG-CONFIG-7**. Tanda de
> diagnostico del gasto de TSK-171 (18.028.203 tokens).

### TSK-172: Permisos totales (ADR-078) + economia de turnos en las reglas + `scripts/smoke_grupos_perfil.js` [CERRADA]

- **Estado:** CERRADA / IMPLEMENTADA EN WORKING TREE (2026-10-02); verificada contra los archivos reales (ADR-006); **commit PENDIENTE**; **requiere REINICIAR OpenCode** (no hay hot-reload: los permisos y los agentes no rigen hasta reiniciar).
- **Prioridad:** Alta (es la corta de friccion y de coste de todo el `task` del proyecto: sin esto, cada tanda paga turnos de dialogo que no son trabajo).
- **Fecha:** 2026-10-02.
- **Origen:** la peticion explicita del operador ("no me tenga que pedir permisos de nada") mas el **diagnostico post-tanda** de TSK-171: 18.028.203 tokens, de los cuales `qa-auditor` gastó **8.066.501 (45%) en 102 turnos**. La causa era **multiplicar el contexto, no el trabajo**.
- **ADR:** DECISIONS.md **ADR-078** (modelo de permisos; decision 1 de la tanda). Sin migracion y sin contrato de API nuevo.
- **Bugs cerrados:** BUGS_HISTORICOS.md **BUG-098 / BUG-CONFIG-7** (falsos FAIL del mini-DOM del propio harness: `getElementById` no reflejaba `el.id`; **instrumentacion de QA, NO bug de producto**).
- **Alcance REAL ejecutado (4 bloques; 21 ficheros de codigo/config y 1 script nuevo):**
  1. **Permiso total en `opencode.json` (`:7-22`)**: el bloque `permission` pasa de **5 a 14 claves, todas en `allow`**: `read`, `edit`, `glob`, `grep`, `list`, `bash`, `task`, `external_directory`, `todowrite`, `question`, `webfetch`, `websearch`, `lsp`, `skill`. Sin cambios en `model`, `small_model`, `default_agent`, `subagent_depth` ni `compaction`.
     - **Hallazgo de causa raiz:** **`external_directory` NO existia** en la configuracion, y es exactamente la clave que hace que opencode pida autorizacion para trabajar con archivos **fuera del repo** (donde vive un arnes de QA, en `%TEMP%`). Ademas **`webfetch` y `websearch` estaban en `deny`**, y los **19 de 20** agentes los declaraban asi en su frontmatter (heredado de ADR-067). No era "el sistema es estricto": era un hueco de config mas una capa de `deny`.
  2. **19 de los 20 agentes de `.opencode/agent/*.md`**: `webfetch: deny` -> `allow`, `websearch: deny` -> `allow`, y `bash: ask` -> `allow` (en `free-plan` y `plan`). **`research-agent.md` NO se modifico**: ya estaba en `allow`, y por eso son **19 y no 20**.
     - **Excepcion deliberada, documentada:** se conservan **`edit: deny` en `@explore`, `@plan` y `@free-plan`** y **`bash: deny` en `@explore`**. Criterio: **`deny` bloquea, no pregunta** -> no genera friccion y ademas ES la separacion de roles de ADR-006/ADR-074 (el que explora informa, el que planifica no escribe). Quitarlas seria perder gobernanza a cambio de nada.
  3. **Economia de turnos, en `AGENTS.md` §3 y en `qa-auditor.md`:**
     - `AGENTS.md:64` (regla 12) incorpora la **formula de estimacion medida**: en la tanda de 18M el `cache_read` fue el **91,7%** del gasto y la salida de herramientas solo el **0,55%**; el coste real es `turnos x contexto acumulado`, asi que se estima con **~50.000 tokens por turno x nº de turnos**, nunca "tokens utiles por tarea". **Estimar por salida de herramientas infraestima 45-70x** -- error cometido por el orquestador en TSK-171 (estimo 250-400k, real 18M).
     - `AGENTS.md:69` (**regla 17, NUEVA**): presupuesto por dominio, **15 turnos y 500.000 tokens por `task`**; si se excede, el brief esta mal troceado. Regla operativa: **1 subagente por modulo** y **el brief da el resultado esperado, no el metodo** (prescribir el metodo multiplica los turnos).
     - `AGENTS.md:70` (**regla 18, NUEVA**): higiene de consumo en tools -- prohibido `git diff` sin `--stat` de archivo > 150 KB; `-m 3` en greps contra los 4 docs grandes; **verificar con los scripts de $0 antes de delegar una auditoria**.
     - `AGENTS.md:71` (**regla 19, NUEVA**): permisos, con cita a **ADR-078**.
     - `AGENTS.md:62` (regla 10): corregido el tamano real de `mi-perfil.html` a **~379 KB** (decia ~230 KB; medido 379,2 KB).
     - `.opencode/agent/qa-auditor.md:17-31`: seccion nueva **"Presupuesto de turnos (OBLIGATORIO)"** con la evidencia medida (`:19`) y **7 reglas duras**: techo **25 turnos**; nunca `git diff` de archivo > 150 KB (solo `--stat`, o `-U0` filtrado con `rg '^[+-]' -m 80`); greps con `-m 3` contra los docs grandes; **reusar scripts existentes antes de construir un harness**; si se construye, **una version y maximo 3 iteraciones** de depuracion; **un comando fallido no se reintenta identico mas de 2 veces**; **recibir rangos de linea** en vez de "audita este archivo"; **Escudo GOLD primero**.
     - **`edit: allow` en `qa-auditor.md` SE MANTIENE de forma deliberada:** se considero ponerlo en `deny` y se descarto porque el agente necesita escribir su arnes en `%TEMP%` y con `deny` **volveria a pedir autorizacion**. Aqui `deny` si habria generado friccion: la restriccion ("NO corriges codigo") es de **prompt**, no de permiso.
  4. **NUEVO `scripts/smoke_grupos_perfil.js`** (1.141 lineas, ASCII-safe, sin dependencias y sin red): convierte en **test reproducible** la cobertura de los 4 modulos agrupados de `mi-perfil.html` (Museo, Guardados, Niveles, Albumes), que hasta ahora solo existia como un arnes temporal que un agente escribio y borro. **Asercion central: perdida de items** (un agrupamiento mal escrito se come elementos). Cubre ademas: balance de divs, `node --check` de los scripts inline extraidos, que **cada item cae en exactamente un grupo**, que el conteo de cada etiqueta coincide con los items que contiene, el **toggle de plegado sin duplicar DOM**, el **auto-apertura de niveles solo en el primer render**, el **tope de 24 de Albumes** y la robustez ante listas vacias / items sin clave / 1.000 items.
  5. **Gate permanente en `npm test` (cierre posterior, mismo dia):** `package.json` -> `scripts.test` **termina en `&& node scripts/smoke_grupos_perfil.js`**, y se anadio el alias **`smoke:grupos`**. Con esto la cobertura de los 4 modulos agrupados deja de depender de que alguien la ejecute a mano: **pasa de existir a morir en silencio a test con puerta de calidad.** Verificado en el archivo real: `scripts.test` tiene **21 pasos** (1 guard + **20 smokes**) y el nuevo es el **ultimo** de la cadena, de modo que un fallo de grupos rompe `npm test` y no se puede commitear sin notar.
- **Evidencia / verificacion (ADR-006, medida en este pase documental):**
  - `opencode.json:7-22` -> **14 claves de `permission`, todas `allow`**; `bash: allow` en `:13`, **`external_directory: allow` en `:15`** (antes inexistente), `webfetch`/`websearch` `allow` en `:18-19`.
  - Conteos reales sobre los **20** `.opencode/agent/*.md`: `webfetch: allow` **20/20**, `websearch: allow` **20/20**, `bash: allow` **19**, `bash: ask` **0**, `bash: deny` **1** (solo `explore`), `edit: deny` **3** (`explore`, `plan`, `free-plan`), `webfetch: deny` **0**.
  - `git status --porcelain` -> **19** ficheros `.opencode/agent/*.md` modificados; `research-agent.md` **no aparece** (confirma que ya estaba en `allow`); `git diff -U0` -> **19** lineas `- webfetch: deny`, **19** `- websearch: deny`, **19** `+ webfetch: allow` y **2** `- bash: ask` (`free-plan` y `plan`).
  - `node scripts/smoke_grupos_perfil.js` -> **Resumen: 73/73 comprobaciones PASS | FAIL 0**, **exit 0**, ~2,0 s.
  - `package.json` verificado: `scripts.test` **termina en `node scripts/smoke_grupos_perfil.js`** (21 pasos: 1 guard + 20 smokes, el nuevo es el ultimo) y `scripts["smoke:grupos"]` = `node scripts/smoke_grupos_perfil.js`. `npm run smoke:grupos` -> **73/73 PASS, exit 0**. `npm test` completo -> **20 suites, 0 FAIL, exit 0**.
  - `node scripts/express_check.js mi-perfil.html` -> **PASS**, divs **563=563**.
  - `mi-perfil.html` medido en **379,2 KB** (coincide con el `~379 KB` de la regla 10 ya corregida).
  - `AGENTS.md:62/64/69/70/71` y `qa-auditor.md:7/17-31/19` leidos en el archivo real: dicen exactamente lo que se cita aqui.
  - Gasto de la tanda previa: **18.028.203 tokens** en total; **`qa-auditor` 8.066.501 (45%) en 102 turnos**.
- **Bug cerrado en este lote (NO de producto):** **BUG-098 / BUG-CONFIG-7**. El mini-DOM del harness tenia `getElementById` mirando solo `attrs.id`, pero `mi-perfil.html` asigna `b.id = 'mis-albumes-ver-mas'` **por propiedad**: en un DOM real eso si se refleja en `getElementById`, el harness no, asi que el boton era invisible y daba **2 falsos FAIL**. Resuelto con un `Object.defineProperty` en `Nodo` (`:176-179`) que refleja `id` hacia `attrs.id`, igual que ya hacia `classList`; el comentario del propio codigo (`:171-175`) deja escrito por que. **Producto correcto, harness incorrecto.** Ademas se sustituyo un backtick literal por `String.fromCharCode(96)` (`:109`), conservando la deteccion de template literals (ADR-002).
- **Incidente de proceso:** una tarea `@js-silo-dev` se **cancelo de nuevo** con el fichero ya escrito en disco (recurrencia de BUG-097 / BUG-CONFIG-6, que queda como esta). Al verificarlo aparecieron 2 FAIL que **no eran de `mi-perfil.html`** sino del mini-DOM: el diagnostico correcto fue "el arnes miente", no "el producto esta roto".
- **NO se toco `api/*` (8/8 funciones serverless INTACTAS); sin migraciones de BD; sin cambios en produccion; `index.html`, `admin.html`, `mi-perfil.html` y los motores de render NO se tocaron en esta tanda** (`mi-perfil.html` ya venia modificado por TSK-171). Ficheros de codigo/config del lote: `opencode.json`, 19 `.opencode/agent/*.md`, `AGENTS.md` y el NUEVO `scripts/smoke_grupos_perfil.js`.
- **Deuda [DEUDA] (lo que queda vivo):**
  (a) **Commit PENDIENTE de todo el lote** y **REINICIAR OpenCode** (obligatorio: no hay hot-reload; sin reiniciar, "lo cambie y sigue pidiendo permiso" es el sintoma esperable, no un fallo del cambio).
  (b) **`scripts/express_check.js`: 26 FAIL globales** en `scripts/*` y `api/utilidades.js`. **Preexistente, NO atribuible a esta tanda.** Deuda ya **extraida a tarea propia: TASKS.md TSK-173** (inventario real medido el 2026-10-02, con separacion entre deuda real y falso positivo del propio checker).
  (c) **`scripts/express_check.js` supera el timeout de 120 s en su corrida completa.** No es un fallo del script: es una limitacion operativa **cuantificada** (causa raiz medida: `express_check.js:122` lanza `childProcess.execFileSync('node', ['--check', ...])`, o sea **un spawn por cada uno de los 365 ficheros JS**; corrida completa medida en **120,92 s** = **0,33 s por fichero**). **Usar filtrado por fichero** (`node scripts/express_check.js mi-perfil.html`), medido en **0,89 s** para 3 HTML y **1,39 s** para 1 fichero: **~86x mas rapido**. Detalle en TSK-173.
  (d) **Decidir si se abre la auditoria de fondo de `pfAplicarTab()`**: el cache `_pfDisp` sigue sin corregirse (deuda (a) de ADR-077) y **ADR-017 lo difiere explicitamente**. Hoy no bloquea nada porque la invariante de composicion de ADR-077 lo hace imposible; abrirla es una decision de producto, no un pendiente tecnico.
  (e) **El endurecimiento futuro de `bash` seria por patron**, nunca volviendo a `ask` (reintroducir `ask` devuelve la friccion que ADR-078 elimina).
  (f) **TSK-166** (calidad real del FREE en dominios duros) y **TSK-167** (re-verificar la allowlist FREE) siguen abiertas; las 3 skills `agentes-roster`/`modelos-verificados`/`reglas-de-oro` **NO existen**: no invocarlas.
- **Fuera de alcance:** `api/*` (**8/8 INTACTO**); `db/` (sin migraciones); produccion.
- **Dependencia:** ninguna. Arranca en frio; el unico requisito operativo para que la tanda "rige" es reiniciar OpenCode.

## Inventario y plan de saneado de los 26 FAIL de `express_check.js` - 2026-10-02 (TSK-173)

> Tarea **de inventario y plan**, NO de ejecucion: en este pase **NO se toco ninguno de los 26
> FAIL**. NO toca `api/*` ni ficheros de codigo; el unico fichero que se evaluara al ejecutar es
> `api/utilidades.js` y solo si el operador aprueba el bloque Critico.

### TSK-173: Inventario y plan de saneado de los 26 FAIL globales de `express_check.js` [PENDIENTE]

- **Estado:** PENDIENTE / **inventario YA DONE y medido** (el alcance de esta entrada es el inventario, el diagnostico del timeout, la criticidad y el plan; el **arrelo de los 26 FAIL sigue entero y sin empezar**).
- **Prioridad:** Media. No rompe el gate de despliegue (ver "Criticidad"), pero mientras siga rojo `express_check.js` **no sirve de puerta de calidad**: da 26 FAIL permanentes y eso entrena al equipo a ignorar el rojo.
- **Fecha:** 2026-10-02.
- **Origen:** deuda (b) y (c) de **TSK-172** (`express_check.js`: 26 FAIL + timeout de 120 s), extraidas a tarea propia porque son deuda viva **sin dueño**. El inventario de abajo se obtuvo **ejecutando el script**, no heredado de la sesion anterior (ADR-006).
- **Sin ADR:** no hay decision de arquitectura que tomar; es saneamiento + possibly una correccion del propio checker (que **si** seria ADR y **NO se decide aqui**). Sin migracion de BD.

#### 1) Inventario real de los 26 FAIL (medido: `PASS 709, FAIL 26 (omitidos 0)`, exit 1, 370 ficheros)

**Ninguno de los 26 toca la agrupacion de `mi-perfil.html` de TSK-171/ADR-077.** Se descarto el riesgo que el pase anterior pidio vigilar: los dos unicos FAIL que nombran `mi-perfil.html` son `smoke_042_pasaporte_billetera.js` (que lo cita 2 veces) y `verify_042_precheck.js`, y **ninguno de los dos toca los grupos** (verificado: `smoke_042_pasaporte_billetera.js` no contiene ni `pf-grupo`, ni `pfGruposRender`, ni `pfGruposToggle`; su unico FAIL es un backtick en la linea 28 que **cuenta** backticks). El agrupamiento queda limpio de esta deuda.

**A. FALSO POSITIVO DEL PROPIO CHECKER (6 ficheros) -- el codigo es CORRECTO, la instrumentacion miente:**

| Fichero | Ocurrencias | Por que es falso positivo (verificado en el archivo real) |
|---|---|---|
| `api/utilidades.js` | doble-escape=3 (654, 723, 723) | `:654` es `JSON.stringify(bJSON).replace(/</g,'\\u003c')` y `:723` genera `replace(/[\\u0300-\\u036f]/g,...)`. Son los **generadores** del escape: en runtime emiten `\u003c` simple, que es exactamente lo que ADR-002 pide. Para escribir `\u003c` en un literal JS hay que poner `\\u003c`; el checker mira el **fuente**, no el valor emitido. |
| `scripts/smoke_058_origen_clasificador.js` | doble-escape=1 (164) | Es un **comentario** que explica la convencion: `// Los acentos se escriben como escapes \\u (ASCII-safe, ADR-002).` |
| `scripts/upload-eventos.js` | doble-escape=1 (41) | Es el **motor** de ASCII-safe: `out += c > 127 ? '\\u' + ('0000'+c.toString(16)).slice(-4) : s[i];`. "Arreglarlo" rompe la funcion. |
| `scripts/smoke_auditoria_pagina_destino.js` | doble-escape=2 (169) | Etiqueta legible de una asercion: `check("SI contiene camara unicode (\\uD83D\\uDCF7)", ...)`. |
| `scripts/smoke_test_gamificacion_v4.js` | doble-escape=7 (285, 286) | Regex de normalizacion: `n.nombre.replace(/\\u00e1/g,'a')...`. En runtime la regex es `\u00e1`, correcta. |
| `scripts/smoke_042_pasaporte_billetera.js` | backticks=1 (28) | `if (mig.charAt(i) === '`') t++;` -- el script **cuenta** backticks para auditar ASCII-safety. |
| `scripts/verify_042_precheck.js` | backticks=1 (84) | `if (contenido.charAt(i) === '`') backticks++;` -- idem. |

**Consecuencia:** la regla `doble-escape` de `express_check.js` es **estructuralmente incapaz de distinguir "escape mal escrito" de "codigo que genera escapes"**, y por eso produces **6 de los 26 FAIL y 10 de las 34 ocurrencias**. Hay **precedente en el repo de la salida correcta**: `smoke_grupos_perfil.js` sustituyo su backtick literal por `String.fromCharCode(96)` (`tsk-172` bloque 4).

**B. BACKTICKS SOLO EN COMENTARIOS O ETIQUETAS (4 ficheros) -- cosmetico puro, sin efecto funcional:** `scripts/resolver-fotos-eventos.js` (backticks=12 en 4, 6, 9: backticks Markdown en comentarios), `scripts/smoke_media_embed.js` (backticks=10 en 3, 14, 206, 207), `scripts/extraer-hostalterraza.js` (backticks=2 en 3, 3), y **`scripts/validate_ficha.js` (backticks=14 en 75, 90) caso especial**: la regex `` /```json\s*([\s\S]*?)```/g `` **necesita** el backtick literal para detectar el bloque *fenced* de la ficha `.md`. Este fichero es el **validador canonico** (cierra BUG-034) y lo usan las skills `create-dynamic-page` y `research-destination`: **no se puede "arreglar" sin cambiarlo por `String.fromCharCode`, y eso NO es una correccion, es ruido.**

**C. TEMPLATE LITERAL SIN INTERPOLACION EN SEEDS (6 ficheros) -- deuda real de estilo, riesgo funcional nulo:** `seed-bogota-gastronomia-guia.js` (2: 63, 135), `seed-bogota-guia-para-el-viajero.js` (2: 51, 119), `seed-la-candelaria-recorrido-por-el-centro.js` (2: 53, 123), `seed-parques-y-espacios-verdes-de-bogota.js` (2: 69, 137), `seed-ruta-salsera-bogota.js` (2: 57, 57), `seed-theatron-guia.js` (2: 54, 134). Patron uniforme de **2 ocurrencias por fichero** = 1 literal de contenido + 1 `console.log` de resumen. Verificado en `seed-ruta-salsera-bogota.js:57`: `descripcion: \`Bogota no duerme, Bogota baila...\`` es **texto plano, sin `${}`**. **No son serverless** (ADR-002 acota los backticks al runtime serverless), asi que la regla esta **mas amplia que la norma** en este grupo.

**D. BOM UTF-8 (5 ficheros, 3 bytes cada uno) -- deuda real y trivial:** `load-bellagio-api.js`, `load-bogota-api.js`, `load-cafe-cinema-api.js`, `load-klandestino-api.js`, `load-quiebracanto-api.js`. Los 5FAIL con `bytes>127=3 (linea 1,1,1)` y el patron **identico**; medido byte a byte: `EF BB BF` en el offset 0 de cada uno, o sea un **BOM UTF-8**, no texto acentuado. Fix de una linea (reescribir sin BOM). Ninguno rompe nada: los 5 dan `PASS sintaxis`.

**E. MOJIBAKE REAL (2 ficheros) -- un caso con impacto en DATOS:**
- `scripts/insert-eventos-bogota.js` (**bytes>127=222**, lineas 2, 14, 15): **contenido corrupto de verdad** -- `BogotÃ¡`, `vÃ­ctimas`, `reconstrucciÃ³n`: texto UTF-8 leido como latin1 y reescrito asi. **Si ese script se ejecuta, escribe texto corrupto en Neon.** Es el unico FAIL con consecuencia de producto.
- `scripts/smoke_test_agenda.js` (bytes>127=60, linea 32): mismo mojibake pero en un separador de caja de un `console.log` (`// â Multidia: activo todos los dias del rango â`). **Cosmetico**, no afecta a las aserciones.

**F. DOBLE ESCAPE REAL (1 fichero) -- el unico bug de contenido autentico de la lista:** `scripts/seed-el-gato-gris-bogota.js` (doble-escape=1, linea 27): `caption: 'Clasicos colombianos en versi\\un contemporanea'`. **Deberia ser `versi\u00f3n`.** En runtime emite la cadena literal `\un`, asi que la descripcion del destino llega **mal escrita a la base de datos**. No es instrumentacion: es un escape mal formado en un dato.

**G. RUIDO ACUMULADO (1 fichero):** `scripts/test-fase1.js` (bytes>127=661 en 13, 16, 22 **+** backticks=66 en 10, 13, 16, 31): unico fichero con las tres comprobaciones a la vez, y el mas ruidoso. Probablemente residuo de la "fase 1" y candidato a **borrado** (Cero Borrado Logico aplica a la documentacion, no a un script muerto; decidir con el operador).

**Recuento:** 26 FAIL = **26 ficheros distintos**. **6** con falso positivo probable del checker (grupo A) + **4** solo comentarios/etiquetas (grupo B, de los cuales `validate_ficha.js` es insustituible) + **6** template literals de estilo (grupo C) + **5** BOM (grupo D) + **2** mojibake (grupo E) + **1** doble escape real (grupo F) + **1** ruido (grupo G) + **1** mixto (`api/utilidades.js`: 24 backticks reales + 3 falsos dobles). Lectura honesta: **deuda real ~19 ficheros**, **falso positivo o no accionable ~7**. **Ninguno bloquea produccion hoy** (ver Criticidad).

#### 2) El timeout: causa raiz medida, coste real y via rapida

- **Duracion real medida: 120,92 s** para la corrida completa (370 ficheros), `exit 1`. Con el timeout por defecto de 120.000 ms de la herramienta, la corrida **se pasa por poco**: el pase anterior no estaba exagerando.
- **Causa raiz (verificada, no supuesta):** `scripts/express_check.js:122` ejecuta `childProcess.execFileSync('node', ['--check', abs], ...)`. Es decir, **un spawn de un proceso Node por cada fichero JS** para el syntax check. Conteo real de ficheros: `api/*.js` = 8, `scripts/*.js` = 357, **total JS = 365**, mas 5 HTML = **370** (coincide con la cabecera `Archivos a verificar: 370`).
- **No hay un fichero patologico:** el coste es **lineal y estructural**, no una comprobacion concreta. **120,92 s / 365 = 0,33 s por spawn de Node en Windows.** Cada fichero pasa ademas por el barrido ASCII (barato, in-process), luego el cuello de botella es el `spawn`.
- **Coste ya pagado:** el timeout **consumo tiempo real** en la tanda de optimizacion de agentes (TSK-172): la corrida completa se lanzo, no termino dentro de la ventana y hubo que repetirla, mientras el oraculo necesita de **~50.000 tokens x nº de turnos** (formula medida en ADR-078): un turno perdido por el timeout es un turno entero de contexto re-leido.
- **Via rapida: el filtrado por fichero** (ya soportado, `express_check.js:12-13`). Medido hoy: `node scripts/express_check.js mi-perfil.html index.html admin.html` -> **0,89 s**; `node scripts/express_check.js api/utilidades.js` -> **1,39 s**. Es **~86x** mas rapido que la corrida completa y por tanto **la forma de uso correcta en modo express y en iteracion**. Regla operativa: `express_check.js` **nunca** en corrida completa salvo auditoria de cierre de tanda; siempre con los 3-5 ficheros tocados.

#### 3) Criticidad y orden de arreglo

**Dato que reencuadra la urgencia: `express_check.js` NO esta en `npm test`** (verificado en `package.json`: `scripts.test` son el guard + 20 smokes, ninguno es `express_check`). Por tanto **ninguno de los 26 FAIL bloquea el gate de despliegue actual**, que es `npm test` + Escudo GOLD por fichero. El gate de calidad real son los smokes (verdes, 20 suites) y el Escudo GOLD.

| # | Bloque | Ficheros | Por que en ese orden |
|---|---|---|---|
| 1 | **Escudo GOLD / serverless** | **`api/utilidades.js`** | El **unico de los 26 en runtime serverless**, luego el unico que pasa por **Escudo GOLD** (AGENTS.md regla 8). Sus 24 backticks son template literals con **SQL multilinea sin interpolacion** (`$1`, `$2` son placeholders de Postgres, no `${}`): deuda real bajo ADR-002, pero **riesgo funcional bajo**. Es serverless y, por presupuesto ADR-010, tocarlo exige confirmacion explicita del operador. **ARREGLAR PRIMERO.** |
| 2 | **Correccion del checker (gate de la tarea)** | `scripts/express_check.js` | Antes de sanear conviene **dejar de medir mal**: la regla `doble-escape` no puede distinguir un bug de un generador de escapes. Mientras no se discrimine, cada fix de instrumentacion (p.ej. `String.fromCharCode`, el precedente de `smoke_grupos_perfil.js`) aparece como deuda nueva y el gate no converge. **Es la unica parte de esta tarea que podria ser ADR**; queda Explicitamente FUERA de este pase. |
| 3 | **Dato en produccion** | `seed-el-gato-gris-bogota.js` (27), `insert-eventos-bogota.js` (2, 14, 15) | Los dos unicos FAIL que **escriben texto equivocado** (uno a la ficha, otro a Neon si se ejecuta). Volumen minimo (7 ocurrencias) y efecto visible para el usuario. |
| 4 | **Instrumentacion que hoy consume el gate** | `smoke_test_gamificacion_v4.js`, `smoke_058_origen_clasificador.js`, `upload-eventos.js`, `smoke_auditoria_pagina_destino.js`, `smoke_042_pasaporte_billetera.js`, `verify_042_precheck.js` | **No son deuda: son instrumentacion que el checker no entiende** (grupo A). No se "arreglan": se corrige el checker o se acepta el FAIL. Decidirlo aqui evita 6 intervenciones inutiles. Nota: `smoke_042` y `smoke_test_gamificacion_v4` **estan dentro de `npm test`**, asi que un "fix" cosmetico de ellos toca el gate de una suite verde. |
| 5 | **Cosmetico puro** | `resolver-fotos-eventos.js`, `smoke_media_embed.js`, `extraer-hostalterraza.js`, `validate_ficha.js` (insustituible), los 6 seeds de grupo C, `smoke_test_agenda.js` | Backticks en comentarios y template literals sin interpolacion en scripts **no serverless**. Impacto nulo. **Van al final, o no van**:ADR-002 acota el backtick al serverless y aqui no aplica. |
| 6 | **Trivial / ruido** | los 5 BOM (grupo D), `test-fase1.js` (grupo G) | Un comando de reescritura sin BOM los resuelve; `test-fase1.js` es candidato a **borrado**, no a saneamiento (decidir con el operador). |

**Marcados aparte por tocar la superficie de Escudo GOLD:** `api/utilidades.js` **SI** (`api/*.js` serverless). `admin.html`, `index.html` y `api/pagina-destino.js` **NO**: sus divs dan **PASS 371/371, 1082/1082 y 563/563** respectivamente, y ninguno aparece en la lista de FAIL.

#### 4) Criterio de cierre de TSK-173

- **Definition of Done primaria:** `node scripts/express_check.js` en corrida completa -> **`Resumen: PASS 735, FAIL 0 (omitidos 0)`, `exit 0`, por debajo de 120 s**. (735 = 709 PASS actuales + 26 FAIL pendientes: total de comprobaciones medido hoy.)
- **Definition of Done secundaria (y la que hace el gate trustworthy):** cada FAIL clasificado en el punto 1 esta **o** corregido **o** reconocido explicitamente como falso positivo en el propio checker. **El objetivo NO es PASS 735 a costa de mutilar instrumentacion**: `upload-eventos.js`, `validate_ficha.js` y las regex de `smoke_test_gamificacion_v4.js` **no se deben tocar**; la via correcta es `String.fromCharCode` / excepcion documentada, como ya se hizo en `smoke_grupos_perfil.js`.
- **`npm test` DEBE o NO incorporar `express_check`? NO, y por esto:**
  1. **Coste:** anadiria **+120,92 s** a cada `npm test` (hoy ~2,0 s x 20 smokes). Convertiria el gate rapido en un gate lento, que es exactamente el fallo de forma que se quiere evitar.
  2. **Rojo hoy:** `express_check` esta en `exit 1` con 26 FAIL. Entrarlo en `npm test` **romperia el gate de todo el producto por deuda cosmetica preexistente**, y volverian a completar el ciclo de "el test rojo se ignora".
  3. **Alcance distinto:** `npm test` prueba **comportamiento de producto**; `express_check` prueba **higiene de fuente de un subconjunto** (365 ficheros, de los cuales 357 son scripts de seed/one-off). Misturar los dos hace que un byte > 127 en un script de hace 6 meses bloquee una correccion de UI de hoy.
- **Cuando si incorporarlo:** solo si (a) el gate esta **verde** (punto 1) **y** (b) la corrida se ha **optimizado** (paralelizar el `node --check` con `spawn` en vez de `execFileSync` serial, o cachear por `mtime`+`size`). Ese es el unico escenario en que `npm test` crece de forma justificada; con 120,92 s medidos hoy, no lo es. **Decision del operador requerida** para el punto (b): es un cambio de codigo del checker, fuera del alcance de esta tarea de inventario.
- **Evidencia (ADR-006, medida en este pase documental):** `node scripts/express_check.js` -> `Archivos a verificar: 370`, `Resumen: PASS 709, FAIL 26 (omitidos 0)`, `exit 1`, **120,92 s**. Filtrado: 3 HTML -> **0,89 s** / PASS 3 FAIL 0; `api/utilidades.js` -> **1,39 s** / FAIL 1. `express_check.js:122` = `childProcess.execFileSync('node', ['--check', abs], ...)`. `api/utilidades.js:654` y `:723` leidos: son los generadores del escape. `insert-eventos-bogota.js:2,14,15` leidos: `BogotÃ¡`/`vÃ­ctimas`/`reconstrucciÃ³n` (mojibake real). `seed-el-gato-gris-bogota.js:27` leido: `versi\\un` (escape mal formado). Los 5 `load-*-api.js`_medidos byte a byte: `EF BB BF` en offset 0 (BOM). `scripts/smoke_042_pasaporte_billetera.js` buscado: **0 coincidencias** de `pf-grupo`/`pfGruposRender`/`pfGruposToggle`.
- **Fuera de alcance (explicito):** arreglar los 26 FAIL; borrar `test-fase1.js`; tocar `api/*` (ADR-010: **8/8 INTACTO**); cualquier cambio en produccion o en la BD.
- **Dependencias:** ninguna. Arranca en frio.
- **Riesgo de la tarea:** el riesgo real no es sanear el codigo, es **malDiagnosticar**: tratar los 6 falsos positivos como deuda real y "arreglar" instrumentacion que funciona (el precedente de BUG-098: *producto correcto, instrumentacion incorrecta*).

## Prioridad SANEADO DE UI DEL PERFIL Y DE COMUNIDAD - 2026-10-02 (TSK-174 / ADR-080 / ADR-081)

> Tanda de **6 cambios de UI** decididos por el operador sobre el perfil y la pestana Mapa de Comunidad. Pase documental **unico (R2)**, modo express, **solo** docs de gobernanza: **NO se toco codigo en este pase**. Working tree, verificado contra los archivos reales (ADR-006); **commit PENDIENTE**.

### TSK-174: Tanda de 6 cambios de UI en `mi-perfil.html`, `comunidad.html` y `mercado.js` [CERRADA]

- **Estado:** CERRADA / EN WORKING TREE (2026-10-02; commit PENDIENTE).
- **Prioridad:** Media (producto). Sin riesgo de gate de despliegue: **no toca `api/*`** (**8/8 INTACTO**, ADR-001/ADR-010), **sin migraciones**, sin cambios en produccion ni en la BD.
- **Fecha:** 2026-10-02.
- **Origen:** instruccion directa del operador sobre 6 puntos de UI (T1..T6), cada uno con su archivo afectado. **Las dos decisiones que ameritan registro van a DECISIONS.md**: **ADR-080** (retirada de la Hoja de Vida del Artista conservando el backend) y **ADR-081** (unificacion de los dos mapas de Comunidad en una sola instancia Leaflet). T1, T4 y T5 **no** tienen ADR: son saneamiento de render y de CSS sin decision de arquitectura. T6 tampoco: es producto dentro de un modulo ya existente.
- **Alcance REAL ejecutado (6 cambios, 7 ficheros de codigo):**

1. **T1 - Cards de mision acortadas (`mi-perfil.html`).** El contenedor `#pf-misiones` renderiza ahora cada mision en **una sola linea con truncado y atributo `title`**; se elimino el volcado crudo de IDs de requisito que inflaba la tarjeta. El helper de render vive **dentro de `cargarMisiones`** y el CSS queda **bajo el silo `#pf-misiones`** (ADR-004).
2. **T2 - Retirada del modulo Hoja de Vida del Artista (`mi-perfil.html` + `usuario-session.js`).** Se elimina el contenedor `#pf-cv`, las funciones `cargarHojaDeVida()` y `v61GuardarHojaDeVida()`, la regla CSS `.pf-v61 .v61-cv-obra`, y los helpers cliente `ExploraCO.miHojaDeVida` / `ExploraCO.guardarHojaDeVida`. En su lugar, **`pf-museo-preview` se mueve de la pestana `museo` a la pestana `perfil`**. **El backend `artista_cv` queda INTACTO**: es la columna `usuarios.artista_cv` (no una tabla), creada por `db/migrations/040_gobernanza_cartas_moneda.sql:441` y sigue en uso por `api/usuarios.js` y `api/pagina-destino.js`. Decision: **ADR-080**.
3. **T3 - Un solo mapa en la pestana Mapa de Comunidad (`comunidad.html` + `mymapa.js` + `mapa-cultural.js` + `mapa-cultural.css`).** De **DOS** mapas Leaflet a **UNO SOLO**: `mymapa.js` crea la instancia unica `MapaCultural` sobre `#av-map-container`, senalizado con `data-cm-mapa="1"`; desaparece el contenedor `mm-personal-map`; `initAudiovisualMap` **deja de crear su propio `L.map` en el camino normal** y adopta la instancia ya viva via `window.MyMap.getMap()` (se conserva una rama de respaldo si el modulo compartido no esta listo). Ambas fuentes --mapas personales y media audiovisual-- conviven en el mismo conjunto, con los filtros de media y los chips de categoria operando sobre el total. Decision: **ADR-081**.
4. **T4 - Lugares del tab Museo con render canonico (`mi-perfil.html`).** "Mis lugares guardados" y "Lugares visitados" dejan de renderizar **HTML crudo** y pasan por el helper canonico **NUEVO `lugarCardHTML`**, enrutado por `pfGruposRender`, con paridad visual respecto a los recursos del Museo. El CSS global `.lugar-*` se sustituye por el **silo atomico `#pf-lugares`** (ADR-004 / Regla de Oro 4).
5. **T5 - El tab Inventario deja de mostrar el catalogo de tienda (`mi-perfil.html`).** Se eliminan el titulo de tienda, `#pf-tienda-chips`, `#pf-tienda`, las funciones `cargarTienda`, `renderTiendaChips`, `setTiendaFiltro` y `categoriaConsumible`, las constantes `PF_TIENDA_CATS`, `PF_TIENDA_CAT` y `PF_CAT_CONSUMIBLE`, mas el CSS `.store-*` y `.tienda-chip*`. **Se conserva `cargarInventario` con su filtro `cantidad > 0`**, que ya era correcto y no se toco.
6. **T6 - Mercado de Comunidad: se ve todo el producto a la venta (`mercado.js` + cache-busting).** Las ofertas se agrupan por **TODAS** las Casas (nuevos `cargarOfertasTodas` y `_ofertasPorCasa`) en lugar de solo la Casa seleccionada; se anade el catalogo completo con filtros "todos / Lo tienes / Disponible" y buscador. La **validacion de propiedad al publicar se mantiene** y **se refuerza en cliente** con `maxPublicable` / `invCant`: **VER mas ya no habilita PUBLICAR mas** y la validacion real **sigue en el servidor** (el cliente es cortesia, no la garantia). Cache-busting a **`mercado.js?v=2`** en `comunidad.html` y `mi-perfil.html`.

- **Evidencia (ADR-006, verificada en este pase documental contra los archivos reales, no contra el historial de la sesion):**
  - `mi-perfil.html`: `pf-cv` = **0**; `cargarHojaDeVida` = **0**; `v61GuardarHojaDeVida` = **0**; `pf-tienda` = **0**; `cargarTienda` = **0**; `renderTiendaChips` = **0**; `setTiendaFiltro` = **0**; `categoriaConsumible` = **0**; `PF_TIENDA_CATS` = **0**; `PF_TIENDA_CAT` = **0**; `PF_CAT_CONSUMIBLE` = **0**; `store-` = **0**; `tienda-chip` = **0**; `mm-personal-map` = **0**.
  - `mi-perfil.html`: `pf-misiones` = **13** (silo CSS + render); `lugarCardHTML` = **4** (declaracion + enrutado por `pfGruposRender`); `pf-lugares` = **14** (silo atomico); `pf-museo-preview` = **28**, y el contenedor `#pf-museo-preview` lleva `data-tab="perfil"`; `mercado.js?v=2` presente.
  - `usuario-session.js`: `miHojaDeVida` = **0**; `guardarHojaDeVida` = **0**.
  - `mymapa.js`: `L.map` = **0**; `initAudiovisualMap` = **0**; `MapaCultural` = **9**; `data-cm-mapa` = **4**; `mm-personal-map` = **1** (solo el valor por defecto `DEFAULTS.contenedor`, elemento que ya no existe -- ver deuda (a) de ADR-081).
  - `comunidad.html`: contenedor **unico** `<div id="av-map-container" class="cmx-mapa" data-cm-mapa="1">`; `initAudiovisualMap` esta en el HTML (no en `mapa-cultural.js`), con camino de adopcion `window.MyMap.getMap()` + `return` temprano y la rama de respaldo `L.map('av-map-container')` en la linea siguiente; `mercado.js?v=2` presente.
  - `mapa-cultural.js`: `initAudiovisualMap` = **0**; sus 2 unicas apariciones de `L.map` estan en la fabrica compartida `MapaCultural` (teardown de la instancia previa + arranque), que es donde corresponde.
  - `mercado.js`: `cargarOfertasTodas` = **4**; `_ofertasPorCasa` = **12**; `maxPublicable` = **2**; `invCant` = **8**.
  - `git status --porcelain`: los **7** ficheros de codigo aparecen como `M` (modificados, **sin commit**): `comunidad.html`, `mapa-cultural.css`, `mapa-cultural.js`, `mercado.js`, `mi-perfil.html`, `mymapa.js`, `usuario-session.js`.
- **Fuera de alcance (explicito):** `api/*` (8/8 INTACTO; `artista_cv` no se toca), cualquier `.sql` o migracion, produccion, el resto de los mapas del producto (ficha, home, admin) y el resto de las pestanas del perfil.
- **Sin smoke nuevo:** esta tanda no anade cobertura automatica. El candidato natural (unicidad de la instancia Leaflet en la pestana Mapa) queda registrado como deuda (b) de **ADR-081**.
- **Deuda [DEUDA]:**
  - (a) **Residuo en `mymapa.js:34`:** `DEFAULTS.contenedor: 'mm-personal-map'` sigue apuntando a un elemento que ya no existe. No rompe nada (el contenedor real va senalizado con `data-cm-mapa="1"`), pero es cadena muerta.
  - (b) **La rama de respaldo de `initAudiovisualMap` puede crear una segunda instancia** si el modulo compartido no esta listo: el invariante "un solo mapa" depende de que `MyMap.getMap()` responda y no de un mecanismo que lo impida.
  - (c) **`pf-v61` sigue con 48 ocurrencias** en `mi-perfil.html` tras retirar `.v61-cv-obra`: revisar si el resto del bloque tiene consumidor vivo (deuda (a) de **ADR-080**).
  - (d) **`artista_cv` queda sin editor en cliente** tras T2: capacidad viva sin superficie de entrada (deuda (b) de **ADR-080**).
  - (e) **Sin commit**: la tanda y sus dos ADR viajan juntos en el working tree.

## Prioridad TIER POR MODELO ACTIVO + ATRIBUCION DE COSTE - 2026-10-04 (ADR-083 / TSK-175)

**Estado:** CERRADA (2026-10-04). **Commit PENDIENTE.**
**Origen:** ADR-083 (`DECISIONS.md`, D1-D5 decididas por el operador). **La premisa de ADR-082 -- "el tier es la sesion entera, lo fija el primario invocado" -- queda DEROGADA; el resto de ADR-082 se conserva integro.** Este ADR fue escrito por `@architect` en la sesion anterior (GATE DE ARQUITECTURA autorizado) y este es su pase documental de cierre (R2), ejecutado en un unico pase por `@docs-keeper`.
**Alcance:** SOLO gobernanza (`AGENTS.md`, skill `cascada-tier`, notas de referencia). **No toca `api/*` (8/8 INTACTO, ADR-010), ni `opencode.json`, ni `.opencode/agent/`, ni `scripts/`, ni migraciones, ni HTML de producto.**

### Que se implemento de verdad (D1-D5), verificado contra los archivos reales (ADR-006)

- **D1 -- Roster 20 -> 18.** BORRADOS `.opencode/agent/free-plan.md` y `free-plan`-pareja `free-build.md`. Quedan **2 primarios de rol** (`plan`, `build`), ambos `mode: primary`, `coste: heredado` y **SIN `model:`**; `plan` conserva `edit: deny` (ADR-078) y `build` no. Los **16 subagentes NO cambian**: siguen SIN `model:` y con `coste: heredado`. Verificado: `Get-ChildItem .opencode\agent` -> **18 archivos**; `Select-String -Path ".opencode/agent/*.md" -Pattern "^\s*model:"` -> **0 coincidencias** (cero pines en todo el roster).
- **D2 -- El invariante de coste pasa de PROHIBICION a ATRIBUCION.** `scripts/ejecucion/verificar-capa-gratis.js` reescrito: **se elimino** el check de unicidad de modelo por sesion; **(c) y (d) reescritos** ((c) exige que los primarios NO declaren `model:` y si `coste: heredado`; (d) ya no exige cobertura de tiers en la configuracion, la mide en `opencode.db`); **(a), (b), (e) y (f) SE MANTIENEN**. Nuevos: reparto por tier desde **`message.data.modelID`** por mensaje de asistente y **detector de ESCALADA TARDIA**. Se conservan `--sesion|--session|--db` y `verificar-herencia`. Resumen nuevo: **`Agentes: 18 | primarios: 2 | subagentes heredados: 16`**.
- **D3 -- Sain de la gobernanza las frases de la premisa vieja.** `AGENTS.md` §0 reescrito (el tier lo fija el **modelo activo de cada turno**; los 16 heredan; la seleccion explicita de modelo **pisa** el pin, PROBADO en carga real; D4 asimetria ~35x), §1 con **18** agentes y columna `model:` = "sin pin (hereda el activo)", §2 con R5 como **atribucion** + el aviso de que **`session.model` del header registra el ULTIMO modelo y NO debe usarse para decidir nada**, y §3 (reglas 11, 12 y 19 ajustadas; 14 y 17 sin cambios porque no contradicen). Skill **`cascada-tier` REESCRITA COMPLETA** (11 secciones): deja de anunciar "los 4 primarios fijan el tier" y pasa a describir atribucion, escalada tardia y `--preflight`. §4 de `AGENTS.md` deja de citarla como fuente de la regla de tier: la fuente es `AGENTS.md` §0/§2 + ADR-083.
- **D4 -- ASIMETRIA DE MOMENTO documentada con numeros medidos.** Turno 2 (~20k de contexto) **~$0.0015** por subagente; turno 25 (~700k) **~$0.0538**: **~35x**. Escalar temprano y recortar turnos son las dos palancas en PAGO.
- **D5 -- `--preflight`** imprime **modelo activo + contexto actual + coste estimado** de continuar en PAGO; el umbral de contexto es un **parametro** (`--umbral`), no una constante, y ningun ADR fijo un valor (la sonda no midio uno).
- **Gates por ROL, no por tier: sin cambios (9 + 7 = 16).** Se reaffirma explicitamente que se piden **siempre**, en FREE y en PAGO, **y tambien cuando la invocacion viene del menu `@`** (que es el bypass de `permission.task`): "pagar no compra saltar el freno" (ADR-082 §6) y con el tier desanclado del agente un gate por tier seria literalmente imposible de escribir.

### Verificacion (ADR-006: comandos, no afirmaciones)

| Que | Comando | Resultado |
|---|---|---|
| Roster en disco | `Get-ChildItem .opencode\agent` | **18** archivos |
| Cero pines | `Select-String -Path ".opencode/agent/*.md" -Pattern "^\s*model:"` | **0** coincidencias |
| Guard | `node scripts/ejecucion/verificar-capa-gratis.js` | **OK** -- `(a) OK 0 de 16` / `(b) OK 16 de 16` / `(c) OK 2 primarios, 2 sin pin` / `(d) OK` / `(e) OK` / `(f) OK`; resumen `Agentes: 18 \| primarios: 2 \| subagentes heredados: 16`; `RESULTADO: OK. Cascada vigente (ADR-082).` |
| Default de sesion FREE (check (f)) | `opencode.json` | `model` y `small_model` = `opencode/space-bunny-free`; `default_agent: "build"` |
| Premisa vieja fuera de lo normativo | `Select-String` sobre `AGENTS.md` y `cascada-tier/SKILL.md` de `"sesion entera\|lo determina el primario\|4 primarios\|free-plan\|free-build\|20 agentes"` | **0 coincidencias** en ambos |

### Referencias colgantes, tratadas

- **NORMATIVAS, reescritas:** `AGENTS.md` (§0, §1, §2, reglas 11/12/19, §4) y `.opencode/skills/cascada-tier/SKILL.md` (completa).
- **HISTORICA, con nota y sin reescribir:** `DECISIONS.md` ADR-082 -- la derogacion ya consta en su encabezado (L4451) y en su Estado (L4457); este pase **anadio una sola nota** al bloque "Nota de cierre -- IMPLEMENTACION VERIFICADA" aclarando que su lista T1-T7 es la foto de la implementacion de ADR-082 y **NO debe ejecutarse como recipe vigente**. **El cuerpo del ADR no se borro ni se reescribio** (Cero Borrado Logico documental).
- **HISTORICA, nota corregida:** `exploraco desarrollo/ampliacion desarrollo/ANALISIS_AGENTES_Y_ECONOMIZACION.md` (notas de L~43 y L~331). Ambas eran notas `[OBSOLETO]` que ademas **afirmaban falsehoods vigentes** ("Roster vigente: 20 agentes = 4 primarios", "`@free-build` para lo rutinario"); se corrigieron solo esas notas (roster 18, primarios sin pin, equivalente vigente = **elegir modelo en el selector**), sin tocar el inventario historico del documento.
- **NO EXISTE:** `ampliacion desarrollo/orestacion agentes.md` (L5, L71-72 citados en el encargo) **no esta en el repositorio** en ninguna carpeta. Referencia colgante sin archivo: no hay nada que actualizar. Verificar si el documento se borro o nunca existio.

### Supuesto abierto (registrado como supuesto, NO como decision)

**S-1 -- si al cambiar de primario/modelo NO se relee el cuerpo del agente, cambiar de tier no surte efecto y el operador cree que bajo: fallo silencioso y caro.** `opencode run` es **no interactivo** y no permite cambiar de agente a mitad, asi que **no es automatizable**. Mitigacion del operador (10 s): **preguntar el modelo activo antes y despues de pulsar Tab**, o correr `--preflight`. **Criterio de rollback (ADR-083):** si se confirma, se restaura el pin fijo en los primarios y el check de unicidad de modelo **vuelve como AVISO, no como prohibicion**, conservando la atribucion por `message.data.modelID` y el detector de escalada tardia (que son ortogonales al mecanismo de tier).

### Deuda [DEUDA]

- (a) **Hueco de la premisa nueva, declarado en `AGENTS.md` §0:** con `default_agent: "build"` sin pin, si el **selector recuerda `opencode-go/deepseek-v4.1-flash`** la sesion abre en **PAGO sin ningun aviso** (`opencode.json` no le gana a un selector con memoria). No es un fallo del guard (el check (f) se cumple).
- (b) **Calidad del modelo de pago sin medir** en `backend-dev`, `sql-security` y `renderer-dev` (heredada integra de ADR-082 (a) / TSK-166): cambiar de tier a mitad hace esta medicion **mas urgente**, no menos.
- (c) **`opencode-go/glm-5.3-flash` sigue sin distinguir** ($0.000950 vs $0.000966): plan B documentado, no pineado.
- (d) **El mensaje del guard sigue diciendo `RESULTADO: OK. Cascada vigente (ADR-082).`** cuando la cascada vigente es la de ADR-083. Es **codigo** (`scripts/`), no documento: no se toco en este pase. Correccion de una linea, sin riesgo, cuando `@js-silo-dev` pase por ahi.
- (e) **Sin commit:** ADR-083, el codigo de D1/D2/D5 y este cierre documental viajan juntos en el working tree.
- (f) **Supuesto S-1 sin verificar**, con criterio de rollback declarado (arriba).

## Realineacion del hero y del posicionamiento de la HOME - 2026-10-04 (TSK-176)

**Estado:** CERRADA (2026-10-04). **Commit PENDIENTE.**
**Origen:** decision del operador sobre copy y color. **NO es una decision de arquitectura, asi que NO se creo ADR** en `DECISIONS.md` (mandato explicito del encargo). Este es su pase documental de cierre (R2), en un unico pase y **sin tocar codigo**.
**Alcance:** **un solo archivo, `index.html`** (16 inserciones / 11 borrados). **No toca `api/*` (8/8 INTACTO, ADR-010)**, ni migraciones, ni `index_pre_full.html` (backup). **El JS de filtros NO se toco.**

### Que se implemento de verdad, verificado contra el archivo real (ADR-006)

1. **Copy del hero.** La eyebrow `.hsey` paso de "Directorio turistico oficial de Colombia" a "**Plataforma de turismo interactivo**". Se conservan la bandera y los `span` decorativos.
2. **Tira de categorias `.htag` ELIMINADA** ("Hospedajes / Comida / Lugares / Eventos culturales"): se borro el HTML **y** su regla CSS muerta. Ocupaba el hueco entre el logo y la barra de busqueda.
3. **Typo corregido:** la pastilla de comida decia "Comidanomia"; ahora dice "**Comida**".
4. **Las 4 pastillas de categoria del hero (`.hcat`) ya no se encienden en `--gold`.** Cada una usa el color que su item ya tiene en el directorio: Hospedajes `#3B82F6`, Comida `#EF4444`, Lugares `#22C55E`, Eventos `#A855F7`. El `:hover` tambien toma su color de categoria y el estado encendido suma un fondo translucido del mismo color. **La regla generica unica se sustituyo por 8 reglas por categoria.** Los botones de "Destacados" (`.dc-btn`) **se dejan en gold por decision del operador**. El JS de filtros no se toco.
5. **Meta/OG/Twitter y footer de la HOME realineados** con el nuevo posicionamiento: `meta description`, `og:title`, `og:description`, `twitter:title`, `twitter:description` y el `.fdesc` del footer. **NO se tocaron** `canonical`, `og:url`, `og:image`, `og:type`, `og:site_name` ni el `<title>`.

### Verificacion (ADR-006: hechos medidos, no afirmaciones)

| Que | Resultado |
|---|---|
| Copy nuevo presente | "Plataforma de turismo interactivo" = **7/7** ocurrencias |
| Tira `.htag` fuera | `htag` = **0** |
| Typo fuera | `Comidanom` = **0** |
| Copy viejo fuera de la home | "oficial de Colombia" = **0** en `index.html` |
| Balance de divs | **368/368** |
| Bloques `<script>` | **11/11** (el 12 es un comentario HTML preexistente) |
| Cascada CSS | correcta: `.hcat[data-cat="x"].on` gana a `.hcat` |

### Pendientes que esta tarea NO resuelve (seguimiento en NEXT.md)

- **Rebrand global PENDIENTE** por decision del operador: ~40 paginas mas y `404.html` siguen diciendo "El directorio turistico mas completo de Colombia". **Solo se alineo la home.**
- **Eyebrow de "Destacados destacados"** (cerca de la linea 1153 de `index.html`) sigue diciendo "Directorio / 80 lugares". **Se dejo a proposito.**
- **`index_pre_full.html` conserva el texto viejo** y es un backup: no se toco, **no es un bug**.

### Deuda [DEUDA]

- **Los 4 hex de `.hcat` son una COPIA MANUAL del mapa `CATS` de `index.html`** (~linea 1361). Si alguien reordena o cambia ese mapa, los colores del hero quedan desincronizados y **nada lo detecta: no hay ningun assert que los enlace**. Es deuda tecnica abierta, no un defecto del cambio.

## Misiones desplegables por estado + galeria de perfil en el modal + "Subir material" en Gestion del Museo - 2026-10-04 (TSK-177 / ADR-077 ENMIENDA 1)

**Estado:** CERRADA (2026-10-04). **Commit `8315fb0`** en `main` (anterior `d9f2878`); 3 ficheros, 487 inserciones / 56 borrados. Pase documental R2 al cierre y **despues** del push, por indicacion del operador: no fue un olvido. `api/*` sin tocar (**8/8 INTACTO**, ADR-010); sin migracion ni endpoint nuevo.

**Alcance:** tres cambios de UI en `mi-perfil.html` (la galeria de perfil pasa al modal de subida, Misiones pasa a desplegable agrupado por ESTADO y "Gestion del Museo" recupera el boton "+ Subir material") mas los 2 smokes afectados.

**Decision (fuente unica del argumento):** `DECISIONS.md` **ADR-077 ENMIENDA 1** -- Misiones es la **5.a superficie** de `pfGruposRender()` y el eje de agrupado pasa a ser por ESTADO; **NO hay ADR nuevo**. La evidencia del veto, del helper intacto y de la unica regla CSS vive alli.

**Verificacion (ADR-006, medida):** `npm test` EXIT 0 (22 pasos = 1 guard + 21 smokes, 0 FAIL); `smoke_grupos_perfil.js` 73 -> 109 (109/109 PASS, Misiones = seccion 8); `smoke_042` 30 -> 45; `node --check` OK; divs 526/526; residuos del modulo retirado = 0; `.pf-gal-*` 9 de 12, cero huerfanas; ASCII 0 bytes > 127; 3 hallazgos de certificacion, todos menores.

**Anulacion:** la nota de **TSK-160** que declaraba retirada `#btn-museo-subir` queda **ANULADA** en ese punto, por peticion explicita del operador; el `id` viejo no vuelve, la capacidad si.

**Deuda [DEUDA]:** (a) QA runtime manual del modal del perfil, sin cobertura automatica; (b) `[DEUDA-EXPRESS]` el `onerror` de la miniatura degrada a `opacity=.3` (cumple ADR-008); (c) el pase documental se hizo tarde (tras el push) por indicacion del operador, no por olvido. Relevo en `NEXT.md`.

## Gobernanza del pase documental: fuente unica, sin megalineas y brief de maquina - 2026-10-04 (TSK-178 / ADR-084)

**Estado:** CERRADA (2026-10-04). Sin commit todavia (este es su pase documental R2, en el mismo turno). 3 superficies de gobernanza: `DECISIONS.md` (+1 seccion), `AGENTS.md` (reglas 10 y 18) y `scripts/docs-evidencia.js` (NUEVO). `api/*` sin tocar: **8/8 INTACTO** (ADR-010); no se ejecuta `npm test` ni se edita codigo de `scripts/`.

**Alcance:** aplicar **D1** (el argumento vive una sola vez en `DECISIONS.md`: 6 lineas por tarea en `TASKS.md`, 8 por relevo en `NEXT.md`, todo lo demas puntero) y **D2** (ninguna linea de mas de 400 caracteres; se parte en items cortos o tabla). Ademas, las enmiendas **10** y **18** de `AGENTS.md`.

**Decision:** `DECISIONS.md` **ADR-084**. D3 (techo de salida de herramienta) y D4 (el brief se pega de la salida de maquina) quedan igualmente incorporadas; D5 liga las dos enmiendas de `AGENTS.md` al ADR.

**Deuda (a) de ADR-084: CERRADA.** El `@architect` declaro `scripts/docs-evidencia.js` inexistente porque su `Test-Path` corrio en paralelo **antes** de que el script aterrizara. **Ya existe y funciona** (ADR-006): `node scripts/docs-evidencia.js --commit HEAD` -> DECISIONS.md **761,1 KB / 4875**, TASKS.md **589,1 KB / 4272**, NEXT.md **404,6 KB / 2311**. **D4 ya tiene mecanismo.**

**Deuda (c) de ADR-084: ABIERTA - Opcion 5 (rotacion).** Mover bloques a `_ARCHIVO` es la **unica** opcion que baja el **tamano en bytes**; sin ella **D1 baja el relato pero no los bytes**. Exige politica de sumidero, criterio de corte y gate propio. Los dos `_ARCHIVO` estan **congelados desde 2026-09-19** y no son sumidero activo; `DECISIONS.md` no tiene sumidero.

**Deuda ABIERTA - alcance real de D2:** antes de este cierre `TASKS.md` tenia **323** lineas >400 caracteres y `NEXT.md` **207**; con este pase quedan **314** y **201**, y **el techo no se cumple todavia en el historico**: ~515 lineas de relato sin ADR que lo sostenga y, por D1, el diagnostico es **falta un ADR**, no subir el presupuesto.

## Vigencia de planes de viaje (`fecha_inicio`) + gate de pestanas por nivel - 2026-10-05 (TSK-179 / ADR-085)

**Estado:** CERRADA y **COMMITEADA** (2026-10-05) en **`427be74`**. [Evidencia FALSA corregida en este pase documental: decia "commit PENDIENTE, ultimo commit `cb4944c`"; verificado con `git log` contra el repo real (ADR-006) que la 044, el backfill `004` y su test **ya estan commiteados** en `427be74`.] Un solo `api/*` y **sin endpoint nuevo**: **8/8 INTACTO** (ADR-010).

**Estado REAL verificado en Neon (2026-10-05, posterior al cierre de arriba):** la 044 **YA ESTA APLICADA** por el camino canonico (`node scripts/apply_sql_file.js db/migrations/044_planes_viaje_fecha_inicio.sql`, "Sentencias detectadas: 2") y el backfill **YA SE EJECUTO** (`--apply --ddmm-aaaa`, 1 fila escrita, 2a pasada no-op con 0 filas). Lo que **queda abierto** de esta tarea es **solo el despliegue** de `api/interacciones.js`.

**Alcance:** dos ejes sobre 4 superficies de producto. (1) **Vigencia de planes**: `fecha_inicio date` derivada del texto libre `fechas` y filtro en las **2** ramas de listado. (2) **Gate de pestanas por nivel** en Comunidad y Mi perfil, con `nivelActual()` + `actualizarPestanasDisponibles()` como rutina compartida. Anade 1 migracion y 1 backfill, **entregados, commiteados y YA EJECUTADOS** en Neon (antes decia "NO ejecutados": era cierto en el momento del cierre y **ya no lo es**).

**Decision (fuente unica del argumento):** `DECISIONS.md` **ADR-085** (`:4917-5117`), D1 a D5. Por ADR-084 D1 el argumento vive alli una sola vez; aqui solo estado y medidas.

**Alcance REAL ejecutado (verificado contra los archivos reales, ADR-006):**
- `comunidad.html`: **3 de 11** `.ctab` con `data-nivel-requerido` (`planes` 6 en `:556`, `pandillas` 14 en `:559`, `wayfarer` 15 en `:560`); las otras **8** quedan abiertas por decision del operador. `#rk-facciones` (`:644`) y `#ao-facciones` (`:745`) a nivel 15. CSS de silo bajo `#community`.
- `mi-perfil.html`: Tabla de Destino **NUEVA** (nivel 11) sobre la rama de API existente `tipo=tabla_destino`; `PF_TABS` de **8 a 9**; CSS de silo bajo `#profile`.
- `api/interacciones.js`: filtro D1 en las **2** ramas, helper puro `parseFechaInicioTexto` y derivacion en `plan_crear`. **`fecha_inicio` NO se anadio al SELECT**, para no romper el contrato que consume `comunidad.html`.

**Verificacion (ADR-006, `@qa-auditor`):** Escudo GOLD **5/5**; `node --check` PASS; parser **13/13** vectores; smoke **27/27**; test del backfill **25/25**; `div` 458/458 y 542/542; `button` 104/104; **8/8** handlers en `api/` (R7 intacto); `calcularNivel` unica; `CAPACIDADES_POR_NIVEL` intacta; `_pfDisp` preservado; **0** nodos borrados (ADR-003).

**Bugs preexistentes corregidos de paso:** `cmNivelActual()` rota (`comunidad.html:3350`) y `pfNivelActual()` degradando el `-1` sin sesion a `1` (`mi-perfil.html:5589`). Detalle y pruebas en `BUGS_HISTORICOS.md` **BUG-100** y **BUG-101**.

**DESVIACION DE NORMA [DEUDA]:** ADR-002 (ASCII-safety) **NO se cumple hoy** en los 4 ficheros del encargo: hay bytes > 127 **legitimos** (emojis UTF-8 reales), asi que la verificacion mide **delta de codigo nuevo = 0**, no cero absoluto. Decidido **NO normalizar** (fuera de alcance, riesgo alto). Relevo en `NEXT.md`.

**BLOQUEANTE [PARCIALMENTE RESUELTO]:** la 044 **YA esta aplicada en Neon** y el backfill **YA se ejecuto**, asi que el **42703** de las **2** ramas de listado **esta resuelto en la base de datos**. Orden obligatorio (no se invierte) y caso de la fila actual, en `NEXT.md` "Que sigue 1" y "Que sigue 2". **LO QUE QUEDA:** desplegar `api/interacciones.js` (paso **manual** del operador: no hay script de despliegue en `scripts/`, ni script de npm, ni `vercel` CLI en el PATH, verificado en esta sesion). Reevaluado como **TSK-181**.

## Diseno del Sistema Economico Integral LATAWEL + NO-ADOPTION del Tri-Token Web3 (Capa 3) - 2026-10-05 (TSK-180 / ADR-086)

**Estado:** CERRADA **EN DISENO, SIN IMPLEMENTAR**. Una sesion, **1 solo cambio de codigo** (`api/usuarios.js`), **0 lineas de economia nueva**. La migracion `045` esta **especificada en el ADR pero NO escrita ni aplicada**. `api/*` sin endpoint nuevo: **8/8 INTACTO** (ADR-010).

**Decision (fuente unica del argumento):** `DECISIONS.md` **ADR-086** (`:5121-6131`, una sola cabecera, ~1.010 lineas; Partes 1 y 2). Por ADR-084 D1 el argumento vive alli una sola vez; aqui solo estado, medidas y referencias.

**Que quedo DECIDIDO** (resumen de una linea cada uno; el porque, en el ADR):
- **Decision A:** **Capa 3 tri-token web3 = NO-ADOPTION FIRME** por riesgo regulatorio colombiano, coherente con ADR-061 (`:3474`); sustituida por la **Capa 2 ampliada**.
- **Enmienda 3 a ADR-061:** `moneda_ledger` pasa de 1 moneda a **3** (CDR/JAG/DLF).
- **Decision D:** el score compuesto se calcula **EN QUERY** (CTE agregada no correlacionada) y **`score_cache` se descarta de raiz**, porque `usuarios` no crece.
- **Los 4 XP sinks:** `alpha=0.20`, `gamma=2.0`, `Costo_Base` 320/560/640/800, precio congelado por fila y **doble tope** (`k` historico para precio; `slot_max_activos` 25/12/10/3 para capacidad), ratificado por el operador.
- **Ranking compuesto:** `Score = XP_Total + (0.50 * Saldo) + Fama_Parche`, con `SALDO_TOPE = 2000` **global** (decision del operador) y transicion por **rampa suave de 30 dias**.

**Revision de arquitectura: DOS rondas de `@architect-review`, los 8 bloqueantes CERRADOS.**
- **Ronda 1 (SOLICITA CAMBIOS, 5 bloqueantes):** los sinks mutaban `xp_total` y degradaban el nivel; la 045 estaba incompleta; el ranking no era calculable; el termino beta no media saldo; la CTE de compra no ejecutaba.
- **Ronda 2 (SOLICITA CAMBIOS, 3 bloqueantes mas):** faltaba `COALESCE` y devolvia posiciones arbitrarias en silencio; no habia escritor del multiplicador, o sea la rampa nunca se encendia; el ADR afirmaba invariantes falsos.

**Alcance REAL ejecutado en codigo (ADR-006):** `api/usuarios.js:1228-1276`, `casa_ranking` reestructurado. Los agregados se calculan en una derivacion que **solo toca `usuarios`** y colapsa a **una fila por `usuarios.id`**, y `casas_cofre` entra **despues**, ya agregado.
- **Motivo:** que ningun JOIN 1:N pueda multiplicar `miembros`, `miembros_activos` ni `xp_total`, ni por cascada `pct`/`multiplicador_xp`/`fee_mercado_interno`, cuando `moneda_cuentas` pase a multi-moneda.
- **Por que no `SUM(DISTINCT xp_total)`:** colapsaria dos usuarios distintos con el mismo XP.
- **Verificado:** `node --check` PASS; **ASCII-safe** (0 bytes > 127, 0 backticks); **no-op numerico** con el estado actual (condor 4/2/2300.5 y jaguar 2/1/1077.25, identico antes y despues).

**CORRECCION DE UNA PREMISA FALSA [importante]:** el riesgo de `casa_ranking` se evaluo como ALTO y **se midio**: era **latente, no activo**. `casa_ranking` **no hace JOIN a `moneda_cuentas`**; su unico JOIN es `casas_cofre`, que es **1:1 por PRIMARY KEY** (`casa`). El ADR-086 ya refleja esta correccion. BUG-104.

**LO QUE NO SE HIZO [explicito, no insinuado]:**
- Migracion **045 NO escrita y NO aplicada**. Ramas de **ranking compuesto** y de **sinks NO escritas**: **0 lineas de codigo de economia nueva**.
- **UI de sinks**, **leaderboard compuesto** y **gate de 20 pestanas NO hechos**.
- Los **11 puntos de gasto del clamp del XP disponible declarados en el ADR pero SIN implementar**.
- El **escritor de la rampa de 30 dias** quedo **promovido a script de mantenimiento**, no cableado.

## Despliegue de `api/interacciones.js` y verificacion en produccion del listado de planes - 2026-10-05 (TSK-181)

**Estado:** CERRADA (2026-10-05) **por desmentir su propia premisa**. Su bloqueante --"desplegar `api/interacciones.js`"-- **era falso**: el codigo **ya estaba desplegado**. No hubo despliegue. Ver el bloque de correccion de premisa mas abajo.

**Alcance original:** desplegar `api/interacciones.js` (filtro de vigencia de planes) y **verificar en produccion** que el listado de planes ya **no** devuelve **42703**.

**HALLAZGO QUE DESMIENTE LA PREMISA [medido, el punto mas importante de la sesion]:**
- `GET /api/interacciones?tipo=planes` devuelve **HTTP 200 con 0 filas**.
- En Neon: **1 plan activo**, **0 visibles** con el filtro 044, **1 oculto** por el.
- Si el codigo **viejo** estuviera desplegado, el endpoint devolveria **1 fila**. Devuelve **0** -> **el filtro 044 ya estaba vivo en produccion**.
- Por tanto el `42703` lo causaba **la migracion sin aplicar**, no el codigo sin desplegar. **Aplicar la 044 fue lo que arreglo la funcion.** No habia nada que desplegar.
- Consecuencia de proceso: la sesion anterior casi consumio una **ventana de despliegue innecesaria** (y su gate de `@backend-dev`) para arreglar algo que era **base de datos**. Ver **BUG-107**.

**BLOQUEANTE DE HERRAMIENTAS [sigue siendo cierto, pero resulto irrelevante]:** el despliegue **NO se puede ejecutar** porque no hay script de despliegue en `scripts/`, ni entrada `deploy` en `package.json`, ni `vercel` CLI en el PATH. **No se toco**: ya no hace falta para esta tarea.

**Verificacion post-push en produccion:** `casa_ranking` **200** (`{"casas":[{"casa":"jaguar","miembros":1,...}]}`), `faccion_ranking` **200**, `planes` **200 `[]`**, `pandilla_ranking` **400** (exige auth; **no es regresion**). El listado vacio es el **efecto correcto** pedido (el plan vencido deja de mostrarse), no un fallo del filtro.

**Efecto esperado y correcto:** con `--ddmm-aaaa` el unico plan activo ("Tour de salsa centro de Bogota", `fechas = "12-09-2026"`) quedo con `fecha_inicio = 2026-09-12`, **fecha ya pasada**, y por tanto **deja de mostrarse**.
- Es el comportamiento pedido ("cuando un plan pasa su fecha limite, debe salir de ahi"), pero **en produccion el listado de planes se vera vacio y eso es lo correcto**, no un fallo del filtro.
- Decision consciente del operador.

**Verificacion de cierre:** listado de planes en produccion sin **42703** y con el plan vencido **efectivamente ausente**. Si aparece **vacio**, es el resultado esperado. Evidencia y Decision en `DECISIONS.md` **ADR-085** / **ADR-086**.

## Migracion `045` del Sistema Economico Integral - 2026-10-05 (TSK-182 / ADR-086)

**Estado:** PENDIENTE. **NO escrita y NO aplicada.** El diseno **completo y aprobado** vive en `DECISIONS.md` **ADR-086**; aqui solo el alcance pendiente.

**Alcance:** escribir y **aplicar** la migracion `045` con el esquema que el ADR ya especifica:
- Generalizacion de `moneda_ledger` de 1 moneda a **3** (CDR/JAG/DLF) y la re-clave de `moneda_cuentas` (Enmienda 3 a ADR-061).
- Los **4 XP sinks**: `Costo_Base` 320/560/640/800, `alpha=0.20`, `gamma=2.0` y **precio congelado por fila**.
- El `xp_gastado_sinks` como campo **distinto de `xp_total`**, porque **`xp_total` no se toca** (ADR-018).
- El **doble tope** (`k` historico para precio; `slot_max_activos` 25/12/10/3 para capacidad); `SALDO_TOPE = 2000` **global**; el multiplicador de la **rampa suave de 30 dias**.
- Los indices de los que dependen las ramas de codigo de **TSK-184**.

**Decisiones de arquitectura ya tomadas (no reabrir):** el score compuesto se calcula **EN QUERY** y **`score_cache` NO se crea**; los sinks **debitan `xp_gastado_sinks`** y **mueven saldo**, nunca `xp_total`; `es_exento = true` en los gastos de XP (un gasto no es una emision, ADR-066); slot dado de baja con `activo=false` y **sin devolver el XP** (ADR-003).
- Faltan por cablear **2 parches de precondicion** antes de aplicar: ver **TSK-183**.

**Orden:** `045` y los parches B1-B5 de **TSK-183** van en el **mismo commit**, **forward-only, sin rollback** (ventana cero). Numero de migracion libre: **`045`**. Migraciones vigentes: la ultima aplicada es la `044`.

## Parches de precondicion B1-B5 para la multi-moneda + escritor de la rampa de 30 dias - 2026-10-05 (TSK-183 / ADR-086)

**Estado:** CERRADA (2026-10-05). **5 de 5 puntos implementados, aplicados y DESPLEGADOS** (commit `7fe1e9f`). Verificado contra los archivos reales (ADR-006); el argumento vive **una sola vez** en `DECISIONS.md` **ADR-086** (tabla B1-B5 de §3, ya corregida de 4 a 5 filas, + **addendum A**), aqui solo el estado.

**Alcance REAL ejecutado (no el plan original):** los 5 parches quedaron como un **puente de doble camino** con `soportaMoneda()` (`api/interacciones.js:2287-2321`, `api/usuarios.js:139-186`), que gatea por la **PK compuesta** (`pg_constraint.conkey = [usuario_id, moneda]`) y ramifica en cada sitio. Con esquema de 1 moneda emite SQL **byte-identico a HEAD**; con 3, el nuevo. **TTL de 60 s** sobre el **booleano resuelto** (no sobre la Promise) y **fail-closed** intacto (si la deteccion falla, se asume 1 moneda). La numeracion canonica es la de este bloque: **B1** `registrarMonedaLedger` (`interacciones.js:2458-2473`), **B2** `ON CONFLICT (usuario_id, moneda)` (`interacciones.js:12948`), **B3** debito con `AND moneda` (`interacciones.js:12720`), **B4** subconsulta escalar (`usuarios.js:806`/`:875`), **B5** `ledger_sum` (`usuarios.js:808`).

**Lo que cambia respecto a lo planificado:** la exigencia de "mismo commit" **dejo de ser la garantia**. El codigo parcheado hace que **no exista fase intermedia**, luego **el orden migracion/codigo dejo de importar** y el orden ejecutable es **migracion primero, redeploy despues** (fallo ruidoso sobre fallo silencioso). **La migracion de economia es la `046`, no la `045`** (el 045 quedo ocupado por la tabla de control, TSK-186), y **queda APLICADA** (ver TSK-188). La linea de "Orden" de este bloque queda **superada** por el addendum del ADR.

**Deuda que queda abierta (no se resuelve aqui):** ventana de **60 s** por el TTL de `soportaMoneda()` -- documentada y aceptada (`BUGS_HISTORICOS.md` **BUG-110**). **Verificacion:** `npm test` **109/109 FAIL 0** antes y despues; ASCII **0/0** en los 3 ficheros; `planes` **HTTP 200** en produccion.

**Por que son precondicion y no detalle:** la Enmienda 3 a ADR-061 hace que `moneda_cuentas` passe de 1 moneda por usuario a **3**. Cada punto de ruptura siguiente leeria una moneda **arbitraria o implicita** en cuanto `moneda_cuentas` sea multi-moneda, y varios **fallan en silencio** devolviendo `0` en vez de error:

- **B1** -- `api/interacciones.js:2382-2394`, `registrarMonedaLedger`: el `INSERT` de `moneda_ledger` **no tiene columna `moneda`**. Con 3 monedas escribe un movimiento **sin moneda asignable**, o sea el ledger deja de ser interpretable.
- **B2** -- `api/interacciones.js:12835`, `ON CONFLICT (usuario_id)`: el upsert resuelve el conflicto por **`usuario_id`**, que ya **no es clave** cuando hay 3 cuentas por usuario; sin `moneda` en la clave puede **pisar la fila de otra moneda**.
- **B3** -- `api/interacciones.js:12720`, `UPDATE moneda_cuentas SET saldo = saldo - $2` en la CTE de compra: el debito **no fija moneda**, asi que descontaria de una cuenta **elegida por el planificador**.
- **B4** -- `api/usuarios.js:723` y `api/usuarios.js:784`, subconsulta escalar `SELECT saldo FROM moneda_cuentas WHERE usuario_id=$1`: con 3 filas por usuario devuelve **una sola, arbitraria**, y `COALESCE(..., 0)` la convierte en un saldo **falso** en lugar de un error.
- **B5** -- `api/usuarios.js:724`, `SUM(delta) FROM moneda_ledger WHERE usuario_id=$1`: **sin filtro de moneda**, mezcla las 3 monedas en un unico numero y **degrada en silencio**.

**Ademas, pendiente:** el **escritor de la rampa suave de 30 dias**. Se acordo que quede **promovido a script de mantenimiento**, **no cableado** en el backend; sin el, el multiplicador nunca se enciende y la transicion se queda en el diseno. Tambien pendiente: los **2 parches de precondicion** que la propia 045 declara y que este mismo bloque cubre.

**Orden:** **mismo commit** que **TSK-182** (la `045`), **forward-only, sin rollback**. Ventana cero: entre la 045 aplicada y estos parches, el ledger y los saldos **no son interpretables**. Justificacion y detalle por punto, en `DECISIONS.md` **ADR-086**.

## Ranking compuesto y los 4 XP sinks en codigo + UI de sinks y leaderboard - 2026-10-05 (TSK-184 / ADR-086)

**Estado:** PENDIENTE. **0 lineas de codigo de economia escritas en esta sesion.** El diseno esta **completo y aprobado** en `DECISIONS.md` **ADR-086**; aqui solo el alcance pendiente.

**Alcance (3 bloques de trabajo reales):**
- **(1) Ranking compuesto en query:** `Score = XP_Total + (0.50 * Saldo) + Fama_Parche`, con `SALDO_TOPE = 2000` **global** y el score calculado **EN QUERY** (CTE agregada **no correlacionada**, con `COALESCE` explicito: sin el devolvia posiciones arbitrarias en silencio, uno de los bloqueantes de la ronda 2). **No se crea `score_cache`.**
- **(2) Las 4 ramas de los XP sinks:** compra atomica con CTE (patron de ADR-055, el que hace posibles los sinks **sin `FOR UPDATE`**), debito de `xp_gastado_sinks` con `es_exento = true`, slots con **doble tope** y precio congelado por fila.
- **(3) UI:** leaderboard compuesto, superficie de los 4 sinks y el **gate de 20 pestanas**.

**Invariante que no se negocia:** **`xp_total` no se toca** en el ranking ni en los sinks (ADR-018). Por eso los sinks **debitan `xp_gastado_sinks`**, no `xp_total`: los sinks mutaban `xp_total` y **degradaban el nivel** del usuario, que fue el bloqueante 1 de la ronda 1 de revision. Cualquier rama que escriba `xp_total` es un **regresion**, no una variante.

**Depende de:** **TSK-182** (esquema) y **TSK-183** (parches) aplicados y desplegados. Los 11 puntos de gasto del clamp del XP disponible estan **declarados en el ADR pero sin implementar** y se cierran aqui. Los bloques CSS nuevos van bajo Aislamiento Atomico (ADR-004).

## 11 puntos de gasto del clamp del XP disponible - 2026-10-05 (TSK-185 / ADR-086)

**Estado:** PENDIENTE. **Declarados y DISENADOS en el ADR, NO implementados** (0 lineas). Se separan de **TSK-184** porque son un bloque **distinto**: endurecer el **gasto** de XP ya existente, no construir la economia nueva.

**Alcance:** los **11 puntos** donde el clamp del XP disponible se gasta y **todavia no esta cableado** a la regla unica del ADR. Cada uno es un **punto de ruptura silencioso** si se cablea la regla nueva a medias: el clamp queda en un valor por defecto y el gasto **no se ve en ningun sitio**.

**Por que no se cierra dentro de TSK-184:** comparten el mismo ADR pero **no el mismo riesgo**. Si la regla nueva se cablea a 6 de 11 puntos, el clamp queda **parcialmente endurecido**, que es peor que no endurecerlo porque **parece** rotos por la regla nueva. El criterio de cierre es **11 de 11** o ninguno.

## Tabla de control de migraciones: 045 aplicada + seed del historico + runner portero - 2026-10-05 (TSK-186)

**Estado:** CERRADA en codigo y en base de datos (2026-10-05). **Pendiente solo lo documental** (ver **TSK-189**).

**Por que existia:** "commiteada != aplicada" ya habia costado una vez (la 044 llego commiteada y nunca aplicada; **BUG-103**). Sin registro, una migracion en disco **no distingue** la que se aplico de la que se escribio.

**Alcance REAL ejecutado (ADR-006, verificado contra los archivos):**
- `db/migrations/045_schema_migrations.sql` (**405 lineas, 6 sentencias**), **aplicada en Neon** y verificada **constraint por constraint**: **6/6 CHECK** nombrados (`_nombre_chk` regex `^[0-9]{3}_[a-z0-9_]+\.sql$`, `_numero_chk` coherencia `numero = substring(nombre,1,3)::smallint`, `_resultado_chk` IN aplicada/historico_no_verificado/fallida, `_checksum_chk` sha256 o NULL, `_duracion_chk`, `_estado_chk` coherencia estado<->`aplicada_en`); **PRIMARY KEY (nombre) 1/1**; **3/3 indices**; **RLS desactivado** (`relrowsecurity=false`, `relforcerowsecurity=false`), decision argumentada (sin `FORCE` el RLS no aplica al propietario, que es el rol del runner, asi que activarlo daria **seguridad falsa**; con `FORCE` bloquearia a los unicos clientes legitimos; sin endpoint nuevo --8/8 agotadas-- no hay cliente no confiable, y el contenido no es sensible). **0 `DROP`/`DELETE`/`TRUNCATE`/`UPDATE` ejecutables** en el fichero. **Reejecucion idempotente** probada.
- `db/cleanups/005_seed_schema_migrations.js` (**361 lineas**): **43 filas**, `INSERT ... ON CONFLICT DO NOTHING`, `--apply` obligatorio en el modo real. **43/43 ficheros casan el regex** de la 045. Reparto verificado en Neon: **`historico_no_verificado`=41**, **`aplicada`+`verificada_en`=1 (la 044, confianza ALTA)**, **`aplicada` sin verificar=1 (la 045, confianza MEDIA)**. **Las 41 filas NO afirman nada sobre Neon**: su estado real sigue **desconocido**, y eso es **deliberado**. **Idempotencia probada** (dos pasadas, 43 omitidas por conflicto, exit 0).
- `scripts/apply_sql_file.js` **reescrito** -- es el **portero**: sin el, la tabla es un adorno. Contrato (a)-(e) **obligatorio para todo fichero dentro de `db/migrations/`**, **sin flag para saltarselo**: registro por fichero, rechazo por predecesor ausente, deteccion de deriva que **nunca sobrescribe el `checksum`** de una fila existente, `notas` saneadas, y fila `failida` + **exit != 0** ante fallo a medias. Regla de predecesor **basada en los ficheros EN DISCO**, no en rango inventado: por eso **001/002 ausentes no invalidan** el historico. Interfaz `--dry-run`, `--json`, `--notas`, `-h`; exit **0** ok / **1** no completado (SQL, deriva, puerta) / **2** uso incorrecto. **Compatibilidad atrasada intacta**: fuera de `db/migrations/` no hay ledger ni puerta, se ejecuta como antes **avisando**, y el informe declara `es_migracion: false`. Caso limite de BD sin la 045 resuelto con `to_regclass()` en vez de `42P01`.
- `scripts/verificar_migraciones_prod.js` **NUEVO** (**386 lineas**): lo que le permite a una IA **verificar produccion sola**. Descubre el endpoint **estaticamente** (`api/interacciones.js` unico fichero que consulta `planes_viaje`; `tipo=planes` rama 6353 / select 6363) con un mapa **explicito y comentado**, no magico. Detecta el `42703` por sus **tres firmas** (codigo Postgres, `SCHEMA_NOT_MIGRATED`, texto de columna inexistente), porque `api/interacciones.js:14501` lo mapea a **HTTP 503**. Estados distintos: `OK`, `FALLIDO_42703`, `ERROR_5XX/4XX`, `SIN_VERIFICAR` (red caida, **distinto de fallo real**). **Un array vacio no es fallo** (el plan vencido). Salud de plataforma via `api/utilidades.js?tipo=diagnostico` (`:769`): **401 se trata como VIVA_CON_AUTH**, no como fallo.

**Verificacion:**
- 045: 6/6 CHECK + PK + 3/3 indices presentes en Neon; reejecucion idempotente; estructura identica.
- Previa y **de verdad**: dry-run de las 6 sentencias contra el motor real en transaccion con **ROLLBACK**, y se **comprobo con `information_schema` que la tabla NO existia tras el rollback**. El autor original **declaro que no pudo verificar la sintaxis** (no hay `psql`, ni docker, ni parser en `node_modules`); el dry-run lo sustituyo.
- Runner: dry-run del **046 ACEPTADO** (43 predecesores, 43 con fila, N-1 ok); dry-run del **047 RECHAZADO** con **exit 1** y `sin_fila: ["046_probe_ledger.sql"]`. **Deriva: 0 de las 43 fichas casan con el disco** (correcto). Provada en positivo insertando una fila con checksum `0000...`: la detecta, reporta disco vs tabla, **bloquea con exit 1** y el checksum almacenado **siguio intacto**. `notas` saneadas probadas con `--notas` portando URL de Postgres y `token=`: URL -> `[CREDENCIAL-ELIMINADA]`, `token=`/`clave=`/`password=` -> `[ELIMINADO]`, valor real de `DATABASE_URL` eliminado, bytes >127 -> `?`, una linea, tope 900. Regresion de compatibilidad: `--dry-run db/cleanups/001_limpieza_datos_prueba.sql` -> 6 sentencias, **exit 0**.
- Verificador de produccion: **salida hoy `NO_CONFIRMADO`, exit 1**, por una razon **honesta** que se documenta en **TSK-187**.

**LO QUE NO SE HIZO [explicito]:**
- **No se aplico la 046** ni ninguna migracion de economia. **La economia sigue sin implementarse: 0 lineas.** La `045` que se aplico es **la tabla de control**, no la economia.
- **No hay ruta no autenticada** que distinga "codigo nuevo desplegado" de "codigo viejo". Ver **TSK-187**.
- **No se redacto el ADR-087** del registro de migraciones. Ver **TSK-189**.

## Cerrojo de autonomia del verificador de produccion - 2026-10-05 (TSK-187)

**Estado:** PENDIENTE. **Primer paso del relevo.**

**Que sigue:** `scripts/verificar_migraciones_prod.js` sigue dando **`NO_CONFIRMADO`, exit 1**, y la razon es un **hueco real**, no un fallo del script.

**El problema exacto:** un **200** por si solo **no prueba despliegue**, porque es compatible con **dos** hipotesis: (a) codigo nuevo + columna existente + 0 planes, y (b) codigo viejo + 0 planes activos. Ahora sabemos que **(b) es falsa** -- hay **1 plan activo** en Neon -- pero **el script no lo sabe, porque no consulta Neon**. Esa es exactamente la ambiguedad a cerrar.

**Alcance:** enseñarle al verificador a **consultar Neon** y reportar el contraste explicito:
- cuantos planes **activos** hay (y, si se puede, cuantos **visibles** con el filtro 044);
- si "0 filas visibles" es coherente con "N activos ocultos por el filtro" o signals un despliegue roto.

Con ese dato, la salida deja de ser `NO_CONFIRMADO` y pasa a `OK` o a `FALLIDO_42703` **con la ambiguedad resuelta**, no por defecto.

**Restriccion dura:** **8/8 funciones serverless agotadas** (presupuesto Vercel Hobby). **Prohibido crear un endpoint nuevo.** El contraste se hace **desde el verificador** (que ya tiene credencial de Neon por entorno), no desde `api/`.

**Defecto real ya identificado, del script y no del proyecto:** `?tipo=diagnostico` **exige `ADMIN_SECRET`**, asi que sin credencial **no hay introspection**. El script acepta `ADMIN_TOKEN` **solo por variable de entorno**, **nunca lo imprime** y **nunca es obligatorio**. Consecuencia honesta: **hoy no existe ninguna ruta no autenticada que distinga (a) de (b)**.

## Migracion 046 del Sistema Economico Integral - 2026-10-05 (TSK-188 / ADR-086)

**Estado:** CERRADA (2026-10-05). **APLICADA EN PRODUCCION** en Neon: **16/16** sentencias, **exit 0**, `resultado='aplicada'`, **1673 ms**, registrada en `schema_migrations` (**3 aplicadas, 0 fallidas**). Numero **046**, no 045: el **045 quedo ocupado por la tabla de control de migraciones** (ver **TSK-186**). **La economia sigue sin ejercitarse** -- el esquema esta, los 4 XP sinks **no cobran**. El argumento vive **una sola vez** en `DECISIONS.md` **ADR-086** (+ **addendum A**), aqui solo el estado.

**Alcance REAL ejecutado (ADR-006, verificado contra el archivo real y contra produccion):**
- **Precondicion cumplida:** los **5 parches B1-B5** de **TSK-183** aplicados y **desplegados** (commit `7fe1e9f`) **antes** de aplicar esta migracion. Orden ejecutable: **migracion primero, redeploy despues**.
- **Esquema verificado tras aplicar:** PK de `moneda_cuentas` = **`usuario_id+moneda`** (la re-clave, presupuesto de los `ON CONFLICT (usuario_id, moneda)`); **5 `ADD COLUMN` de moneda**; `sink_acciones` = **4 filas**; `sink_slots` = **0**; semillas `ranking%` = **3**; **8** indices.
- **Defecto de la propia 046 corregido antes de aplicar:** se **elimino la seccion `EXCEPTION`** y el `IF EXISTS` se cerro con `ELSE -> RAISE EXCEPTION` (P0001, `046:116-128`). Con el texto viejo, el escenario `23505` se tragaba el error, imprimia `NOTICE "NO se reclava"` y **registraba la migracion como aplicada** -> `42P10` permanente. Ahora **aborta en 6/16**. Ver **BUG-108**.
- **Canonico `delfin`, no `dlf`:** los **4 `CHECK`** de la 046 usan `delfin` (**0 apariciones de `dlf`**); `DLF` es **etiqueta de render**, no valor de columna.
- **Estado de los datos:** las tablas de mercado siguen **vacias en Neon** (`moneda_cuentas=0`, `moneda_ledger=0`, `moneda_mercado=0`, `usuarios=10`).
- **NO verificable por HTTP:** `scripts/verificar_migraciones_prod.js` sale con *"Ningun endpoint declarado consulta esa tabla"* y **exit 1**. **Es correcto y no es un FAIL**: la 046 crea tablas nuevas y re-clava una tabla vacia, luego su efecto no es observable desde un endpoint. No se maquilla como OK.

**Nota de nombre:** TSK-182 (creada en el primer pase de esta sesion) describia esta misma migracion con el numero `045`. Este bloque **la sustituye** para que no queden dos tareas con migraciones distintas; TSK-182 queda como antecedente con premisa superada.

**Alcance:** **contenido identico al que ya declara ADR-086 para TSK-182**, solo cambia el numero de migracion. El diseno completo vive en `DECISIONS.md` **ADR-086**; aqui solo el pendiente:
- Generalizacion de `moneda_ledger` de 1 moneda a **3** (CDR/JAG/DLF) y la re-clave de `moneda_cuentas` (Enmienda 3 a ADR-061).
- Los **4 XP sinks**: `Costo_Base` 320/560/640/800, `alpha=0.20`, `gamma=2.0`, precio congelado por fila.
- `xp_gastado_sinks` como campo **distinto** de `xp_total`, porque **`xp_total` no se toca** (ADR-018).
- El **doble tope** (`k` historico; `slot_max_activos` 25/12/10/3), `SALDO_TOPE = 2000` global, y el multiplicador de la **rampa suave de 30 dias**.
- Los indices de los que dependen las ramas de codigo de **TSK-184**.

**Decisiones ya tomadas, no reabrir (ADR-086):** el score se calcula **EN QUERY** y **`score_cache` NO se crea**; los sinks **debitan `xp_gastado_sinks`** y mueven saldo, **nunca `xp_total`**; `es_exento = true` en los gastos de XP (un gasto no es una emision, ADR-066); slot dado de baja con `activo=false` y **sin devolver el XP** (ADR-003).

**Precondicion y orden:** los **5 parches B1-B5** de **TSK-183** van **en el mismo commit**, **forward-only, sin rollback** (ventana cero). Con el ledger ya registrado, la 046 debe **pasar la puerta del runner** (`scripts/apply_sql_file.js`), lo cual es intencionado: si el predecesor no esta, el runner **rechaza**.

**Nota de nombre:** TSK-182 (creada en el primer pase de esta sesion) describia esta misma migracion con el numero `045`. Este bloque **la sustituye** para que no queden dos tareas con migraciones distintas; TSK-182 queda como antecedente con premisa superada.

## ADR-087 -- registro de migraciones (RLS, predecesor por disco, niveles de confianza, deriva) - 2026-10-05 (TSK-189)

**Estado:** PENDIENTE. **NO redactado. NO lo redacta `@docs-keeper`** (R2: los docs no inventan argumentos de arquitectura). Ruta: **`@architect`**, y opcionalmente `@architect-review`.

**Por que hace falta:** las cuatro decisiones del registro de migraciones **viven hoy solo en comentarios de `db/migrations/045_schema_migrations.sql`** y en el runner:
1. **RLS desactivado** y por que activarlo sin `FORCE` daria seguridad falsa (el RLS no aplica al propietario, que es el rol del runner) y con `FORCE` bloquearia a los unicos clientes legitimos.
2. **Regla de predecesor basada en los ficheros EN DISCO**, no en rango inventado -- por eso **001/002 ausentes no invalidan el historico**.
3. **Niveles de confianza** del seed: `historico_no_verificado` (41 filas que **no afirman nada** sobre Neon), `aplicada`+`verificada_en` (confianza ALTA) y `aplicada` sin verificar (MEDIA, porque el runner no puede verificarse en el instante en que se inscribe).
4. **Deteccion de deriva**: el checksum **nunca se sobrescribe** en una fila existente, y la deriva **bloquea**.

**Por que es normativa, no cosmetica:** **ADR-084 D1** exige que el argumento de una decision **viva una vez**, en su ADR. Hoy el argumento vive **repartido en comentarios de codigo**, que es exactamente lo que ADR-084 D1 viene a corregir. Las tareas apuntan al ADR-086; **este registro de migraciones no tiene ADR**.

**Cuando se escriba, ademas debe recoger:** (a) que el **driver HTTP de Neon no acepta lotes multi-sentencia** (BUG-105), o sea que **el unico modo de dry-run con ROLLBACK es via `Client`**, no via `/sql`; (b) que `sql.transaction()` existe pero **no da ROLLBACK**; (c) la ratificacion del **exit code 2** de `apply_sql_file.js` (ver deuda abierta).

## Deuda abierta y rutas NO verificadas de la tanda 045 - 2026-10-05 (TSK-190)

**Estado:** PENDIENTE. **Se registra, no se resuelve.** Cerrar sin verificar es peor que dejar escrito.

**(a) Exit code 2 para "fichero no existe" [@js-silo-dev]:** el codigo paso de **1 a 2** porque es **uso incorrecto**, no fallo. **No hay llamadas programaticas al script**, asi que **no rompe a nadie** hoy, pero **es un cambio de contrato** y **deberia ratificarse** (idealmente en el ADR-087).

**(b) Typo en Neon:** la `notas` de la fila `044` dice **"APlicada"** en vez de "Aplicada". El seed ya lo dice bien. **NO se hizo UPDATE** porque la tabla tiene la **regla de no mutar filas registradas**. **Deuda consciente**, no descuido.

**(c) Rutas NO verificadas en ejecucion [el agente las declaro, no las disimulo]:**
- **(i)** El camino de **fallo a medias (e)** contra un SQL que falle de verdad: **no se provoco** porque habria dejado una fila `failida` **en produccion**. Verificado **por revision**, no en ejecucion.
- **(ii)** Los **dos caminos "sin ledger"** (fichero `<= 45` y `> 45` en una BD sin la 045): **no se provaron** por no haber una segunda BD sin la 045. El mecanismo `to_regclass` **si se verifico** contra el motor.
- **(iii)** El **`UPDATE` de una fila que estaba en `failida`**: **no se ejecuto**, por coherencia con la regla de no mutar filas registradas.

## Regla de actualizacion
Toda tarea completada debe reflejarse aqui (cambio de Estado) y su cierre debe registrarse en NEXT.md como parte del ciclo documental (AI-DOS Cap. 9.9)[cite: 1]. Nueva tarea -> Modificar proyecto -> Actualizar documento -> Continuar Sprint[cite: 1].