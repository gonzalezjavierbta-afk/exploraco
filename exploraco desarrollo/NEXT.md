# NEXT.md - ExploraCO

Documento de relevo tecnico (AI-DOS Cap. 9.4). Debe permitir que cualquier IA continue el proyecto sin depender del historial de chat.

## Que se estaba haciendo

### Sesion actual (Fase 9) - Primer evento del motor: Rock al Parque 2026

Se creo la pagina dinamica `rock-al-parque.html` como el PRIMER destino con
`categoria_slug='evento'` servido por el motor, replicando el patron de los
lugares (commit 5c43145): seed + loader idempotente. El usuario pidio buscar
los 3 eventos mas importantes de Bogota (Rock al Parque 2026, Morat World
Tour, Festival de Verano 2026) y eligio Rock al Parque 2026.

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

Verificacion: `node --check` limpio en los 2 scripts; ASCII-safety 0 en
ambos; smoke heredado `scripts/smoke_test_evento.js` 14/14 PASS; smoke del
evento real 8/8 PASS. En prod (via POST /api/admin-destinos, id
754d852f-...): GET /api/pagina-destino?slug=rock-al-parque = 200 con las 5
secciones de evento; sitemap incluye el slug; /api/destinos lo lista.

#### Que sigue
1. **Commit + push (PENDIENTE):** el `git rm` del estatico solo surte
   efecto tras el deploy de Vercel. Hasta que se commitee, la URL publica
   `/rock-al-parque.html` seguira sirviendo el placeholder viejo del ultimo
   deploy. Tras el push, verificar GET /rock-al-parque.html = 200 con las
   secciones de evento.
2. Si el usuario quiere mas eventos, replicar este patron (seed + loader +
   TAGS evento) para los 18 existentes con tags vacios (ej. morat,
   feria-libro-bogota) o nuevos slugs. OJO: cada evento con pagina
   estatica vieja en la raiz necesita `git rm` antes (mismo conflicto que
   rock-al-parque).
3. Backlog sin commitear de la sesion previa (Fase 8): migracion 005 en
   Neon + deploy del sistema gaming + `scripts/insert-eventos-bogota.js`
   (untracked) y `agenda.html` modificado (no se tocaron en esta sesion).

#### Riesgos activos (Fase 9)
- La URL publica sigue mostrando el placeholder estatico hasta el deploy.
- Los eventos previos en Neon tienen tags vacios: si un slug con pagina
  estatica vieja se carga como dinamico, el estatico gana (Vercel) --
  revisar por evento antes de sembrar.

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
- La migracion 005 NO esta aplicada en produccion; desplegar antes de
  migrar rompe el GET de logros (los POST degradan sin 500 gracias al
  try/catch de evaluarLogros).
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
   fuera del ciclo de refresco, usuario-session.js sin verificar, admin.html
   con desbalance pre-existente de 1 div.

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
- **Desbalance pre-existente de 1 div en admin.html (NUEVO, hallazgo de
  auditoria):** 632 divs abiertos vs 631 cerrados segun git; NO fue
  introducido por esta sesion (los cambios de admin.html de esta sesion
  pasaron verificado de balance en el diff). Pendiente de localizar y
  corregir en una sesion futura; no parece romper el render actual (los
  navegadores toleran 1 cierre faltante), pero viola el Escudo GOLD y
  cualquier adicion futura de divs puede empeorar el desbalance.
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

- **admin.html:** 5.894 lineas (referencial; +86 por el formulario de blog con select multiple de temas, campo video y buscador de autor -- ver TSK-043/TSK-044). Desbalance pre-existente de 1 div en git (632 vs 631), no introducido por esta sesion (ver Riesgos activos).
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
