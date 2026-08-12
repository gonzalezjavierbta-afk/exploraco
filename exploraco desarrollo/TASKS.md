# TASKS.md - ExploraCO

Tablero operativo del proyecto (AI-DOS Cap. 9.4)[cite: 1]. Cada tarea incluye: ID, Prioridad, Responsable, Estado, Dependencia, Sprint, Detalle t\u00e9cnico y Evidencia f\u00edsica de \u00e9xito.

## Leyenda de estado
- **PENDIENTE:** no iniciada[cite: 1].
- **EN PROGRESO:** iniciada, sin cerrar[cite: 1].
- **BLOQUEADA:** requiere una dependencia previa[cite: 1].
- **COMPLETADA:** cerrada e integrada[cite: 1].

---

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
- **Estado:** PENDIENTE[cite: 1]
- **Dependencia:** Presupuesto de endpoints de Vercel Hobby[cite: 1]
- **Sprint:** Sprint 5+ (fuera del piloto QR Terraza)[cite: 1]
- **Detalle t\u00e9cnico:** Reutilizar un endpoint de servidor para capturar las peticiones GET y permitir Server-Side Rendering b\u00e1sico para la extracci\u00f3n de meta etiquetas.
- **Evidencia f\u00edsica de \u00e9xito:** La etiqueta og:title del `<head>` cambia de manera program\u00e1tica al inspeccionar el c\u00f3digo fuente de acuerdo al par\u00e1metro `q`.

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

---

## Regla de actualizacion
Toda tarea completada debe reflejarse aqui (cambio de Estado) y su cierre debe registrarse en NEXT.md como parte del ciclo documental (AI-DOS Cap. 9.9)[cite: 1]. Nueva tarea -> Modificar proyecto -> Actualizar documento -> Continuar Sprint[cite: 1].