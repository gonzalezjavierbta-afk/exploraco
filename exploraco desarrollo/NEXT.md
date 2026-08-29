# NEXT.md - ExploraCO

Documento de relevo tecnico (AI-DOS Cap. 9.4). Debe permitir que cualquier IA continue el proyecto sin depender del historial de chat.

## Que se estaba haciendo

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
