# GUIA_DE_DESARROLLO.md - ExploraCO

Guia maestra de desarrollo de ExploraCO. Documento de onboarding y referencia
para que CUALQUIER inteligencia artificial (Claude, Gemini, ChatGPT, opencode,
etc.) pueda continuar el trabajo con contexto completo, sin depender del
historial de una conversacion.

- Version: v1.0
- Fecha: Septiembre 2026
- Estado: Guia de referencia activa (no reemplaza al AI-DOS Core, lo complementa)

---

## 1. Protocolo de uso para cualquier IA

### 1.1 Orden de lectura obligatorio

Antes de proponer o ejecutar cualquier cambio, una IA nueva debe leer, en este
orden:

1. `exploraco desarrollo/PROJECT.md` - objetivo, alcance, stack y estado del proyecto.
2. **`exploraco desarrollo/GUIA_DE_DESARROLLO.md` (este documento)** - mapa general de todos los sistemas y como operan.
3. `exploraco desarrollo/NEXT.md` - el relevo tecnico: que se estaba haciendo, riesgos activos y que sigue.
4. `exploraco desarrollo/TASKS.md` - historial de tareas (TSK-xxx / TASK-xxx) con evidencia de verificacion.
5. `exploraco desarrollo/BLUEPRINT.md` - referencia tecnica principal (arquitectura, motor JSONB, patron de 7 pasos, scripts de verificacion).
6. `exploraco desarrollo/DECISIONS.md` - registro de decisiones arquitectonicas (ADRs).
7. `exploraco desarrollo/BUGS_HISTORICOS.md` - fallas ya resueltas que NO deben repetirse.
8. `exploraco desarrollo/🛡️ Reglas de Oro ExploraCO - v5.md` - las reglas de oro del proyecto.

### 1.2 Regla ADR-006: el archivo real es la verdad

NUNCA confiar en un numero de lineas, estado ("Pendiente"/"Completo") o
descripcion citados en un documento sin verificar el archivo real. El historial
de chat o un Context Package de otra sesion de IA NO es fuente de verdad.
Siempre pedir el archivo mas reciente y trazar el flujo dato-por-dato antes de
dar algo por "pendiente", "completo" o "sin dependencias externas".

### 1.3 Regla clave para probar endpoints por id

Los endpoints que filtran por `usuario_id` (o cualquier UUID) deben probarse
SIEMPRE con un UUID real de la tabla `usuarios`. Probar con un id arbitrario
("test", "123") produce `invalid input syntax for type uuid` en Postgres y fue
causa de falsos positivos historicos (ver BUG-021 en BUGS_HISTORICOS.md).

---

## 2. La plataforma en 5 minutos

### 2.1 Que es ExploraCO

ExploraCO es una plataforma web multi-categoria de descubrimiento y promocion
de destinos en Colombia: sitios turisticos, hostales, comida, eventos y blog
(Inspirate). Tiene paginas dinamicas generadas 100% en servidor, un panel de
administracion propio (admin.html) y un modelo de datos flexible basado en
JSONB que permite escalar por categoria sin redisenar el esquema relacional.

Sistemas principales (los 4 nucleos que documenta esta guia):

| Sistema | Donde vive | Resumen |
|---|---|---|
| Registro en directorios | publicar.html, admin.html, admin-destinos.js, publicar-lugar.js | 4 vias para crear destinos (form publico, admin, seeds editoriales, tarjetas estaticas) |
| Guardado de mapas | index.html, mapas.html, usuario-session.js, interacciones.js | Mapa cultural, "Mi Mapa" personal y mapas tematicos publicos/privados |
| Social | interacciones.js, comunidad.html, mi-perfil.html, mi-lugar.html | Resenas, rating, guardados, visitas, sesion por email, comunidad y ranking |
| Gaming | interacciones.js, usuarios.js, usuario-session.js, index.html | XP, niveles, badges, misiones, trofeos/logros con rareza estilo Steam |

### 2.2 Stack tecnologico

| Capa | Tecnologia |
|---|---|
| Hosting / Deploy | Vercel Hobby (auto-deploy desde GitHub) |
| Base de datos | Neon PostgreSQL (driver `@neondatabase/serverless`) |
| Backend | Node.js serverless functions, CommonJS estricto (`require` / `module.exports`) en `api/*.js` |
| Frontend | HTML + JS Vanilla, sin frameworks (ADR-001), generacion de HTML server-side por concatenacion de strings (ADR-002) |
| Repositorio | gonzalezjavierbta-afk/exploraco |
| Dominio | https://exploraco.vercel.app (dominio propio exploraco.co pendiente de conectar) |

Restriccion critica de plataforma: **Vercel Hobby limita a 8 funciones
serverless**. El presupuesto esta consumido en su totalidad (8/8). Cualquier
endpoint nuevo requiere fusionar responsabilidades dentro de un archivo
existente via query params (patron `?tipo=` ya usado en admin.js, utilidades.js
e interacciones.js), NUNCA crear un archivo nuevo en `api/`.

### 2.3 Arquitectura general

```
ADMIN (admin.html) / PUBLICAR (publicar.html) / SEEDS (scripts/)
  -> _placeToAPI() / payload
  -> POST/PUT /api/admin-destinos o POST /api/publicar-lugar
  -> admin-destinos.js (INSERT/UPDATE, merge JSONB) / publicar-lugar.js (draft)
  -> Neon PostgreSQL (destinos, destinos_fotos, destinos_detalles, interacciones, usuarios, mapas, mapa_destinos)
  -> Visitante pide /{slug}.html
  -> vercel.json rewrite -> /api/pagina-destino?slug=...
  -> pagina-destino.js v9 hace SELECT en 4+ tablas
  -> buildHTML() ensambla el HTML final por concatenacion de strings
  -> respuesta HTML con Cache-Control: no-store
```

### 2.4 Endpoints (api/*.js) - presupuesto fijo: 8 de 8

| Endpoint | Metodo(s) | Responsabilidad |
|---|---|---|
| destinos.js | GET | Listado publico, filtros, `modo=mapa`, stats (Cache s-maxage=10) |
| usuarios.js | GET/POST | Perfil, leaderboard, upsert de usuario, nivel/badge/logros derivados |
| interacciones.js | GET/POST | Resenas, guardados, visitas, rating, XP, misiones, logros, mapas tematicos, dims_avg, mi_rating |
| admin-destinos.js | GET/POST/PUT/DELETE | CRUD completo con auth Bearer (v2, merge JSONB) |
| publicar-lugar.js | POST | Formulario publico, crea destino en status=draft + notifica admin |
| pagina-destino.js | GET | HTML dinamico premium por slug (v9, motor principal) |
| admin.js | GET/POST | Recursos admin via `?recurso=`: solicitudes, resenas, destacado, notificaciones |
| utilidades.js | GET | sitemap, visitas, fotos, diagnostico, blog-lista (SSR de blog.html), buscar (SSR de /buscar) |

Autenticacion: header `Authorization: Bearer exploraco12345` (o `ADMIN_SECRET`
de entorno). Variables de entorno en Vercel: `DATABASE_URL`, `ADMIN_SECRET`,
`RESEND_API_KEY`.

Rewrites clave en `vercel.json`:

```
/:slug.html  -> /api/pagina-destino?slug=:slug
/sitemap.xml -> /api/utilidades?tipo=sitemap
/blog.html   -> /api/utilidades?tipo=blog-lista   (debe ir ANTES de /:slug.html)
/buscar      -> /api/utilidades?tipo=buscar
```

ADVERTENCIA: un archivo HTML estatico en la raiz con el mismo slug GANA sobre el
rewrite (los estaticos tienen prioridad en Vercel). Si un slug debe servirse
como pagina dinamica y existe un `.html` estatico, hay que hacer `git rm` de ese
estatico primero (caso real: `rock-al-parque.html`).

### 2.5 Reglas de Oro v5 (resumen operativo)

1. **ASCII-Safe (CRITICO en api/*.js):** cero caracteres > 127, cero tildes, cero
   `ñ` directa, cero emojis directos, cero backticks (`` ` ``). Usar escapes
   Unicode simples `\uXXXX`. El doble escape `\\uXXXX` es un bug (BUG-002).
2. **Edicion estructural via Python:** los cambios grandes en admin.html
   (~7.800 lineas) deben hacerse con `str.replace()` exacto, verificando balance
   de `<div>`/`</div>` y de comentarios `<!-- -->` antes de entregar.
3. **Persistencia JSONB por MERGE:** nunca reemplazar `tags` completo; usar
   `tags = COALESCE(tags,'{}') || $new::jsonb` (ADR-003). Cero borrado logico
   (los IDs logicos de contrato quedan en el codigo aunque no se vean).
4. **Aislamiento atomico de estilos:** todo CSS de una seccion/plantilla vive
   bajo un selector padre unico (`.cat-sitio`, `.cat-hostal`, `.tpl-pX`, ...)
   iniciando con un "Reset de Silo".
5. **Interactividad fisica:** los elementos que requieren accion (FAQ, tabs,
   formularios) llevan `onclick` inyectado fisicamente en el HTML generado por
   el servidor.
6. **Escudo de Auditoria GOLD:** certificar antes de desplegar (ver seccion 9).
7. **Estilos premium:** iconos solo SVG integros (prohibidas fuentes de iconos
   externas); tipografia Barlow Condensed (titulos) + Outfit/Geist (cuerpo);
   paleta dorado `#E8A020` / negro `#111` / fondo warm `#FBF8F2`.
8. **Protocolo de entrega:** pedir siempre el archivo real mas reciente.
9. **Codigo quirurgico:** entregar bloques completos con puntos de entrada/salida.
10. **Mandato de indagacion:** cerrar los prompts a Claude con "hacer las
    preguntas necesarias para completar la tarea de la mejor forma posible".

### 2.6 Presupuesto de archivos en api/ - CONTADOR OBLIGATORIO

La carpeta `api/` debe contener EXACTAMENTE 8 archivos de funciones. Cualquier
`.js` en `api/` cuenta como funcion serverless en Vercel Hobby. Los scripts de
seed/loader/smoke viven en `scripts/` (nunca en `api/`), por eso son ilimitados.

---

## 3. Mapa de archivos del repositorio

### 3.1 Backend serverless (`api/`)

| Archivo | Rol |
|---|---|
| `api/destinos.js` | Listado publico + `modo=mapa` + stats. `toPlace()` normaliza filas Neon -> objeto cliente. Blog excluido salvo `?categoria=blog`. |
| `api/usuarios.js` | Upsert de usuario (login por email sin password), leaderboard, nivel/badge/total_logros derivados en cada lectura. |
| `api/interacciones.js` | Motor social/gaming: resena/rating/visita/guardado + quitar_*, XP, MISIONES (6), LOGROS (16), mapas tematicos (CRUD), GETs (resenas, dims_avg, guardados, is_guardado, mapa, mi_rating, logros, mapas_mios, mapas_publicos, mapa_detalle). |
| `api/admin-destinos.js` | CRUD de destinos con auth Bearer. POST con `ON CONFLICT (slug) DO UPDATE`. PUT con merge JSONB. DELETE en cascada. |
| `api/publicar-lugar.js` | Formulario publico: INSERT draft, slug aleatorio, tags JSONB, notificacion email al admin. |
| `api/pagina-destino.js` | Motor de renderizado v9: SELECT multi-tabla + `buildHTML()` (secciones condicionales por categoria) + JS inline con `onclick` fisico. |
| `api/admin.js` | Recursos admin por `?recurso=`: solicitudes (moderacion draft), resenas (listar/eliminar + recalculo), destacado (planes), notificaciones (email Resend). |
| `api/utilidades.js` | Sitemap dinamico, contador de visitas, blog-lista (SSR /blog.html), buscar (SSR /buscar), diagnostico, fotos. |

### 3.2 Conectores frontend (scripts en la raiz, NO cuentan contra el limite)

| Archivo | Rol |
|---|---|
| `index-api-connector.js` | Carga dinamica de index.html: fetch `/api/destinos`, repuebla `PL[]`, `MAPA_PLACES[]`, `DEST_PHOTOS{}`, `DEST_FEATURED_IDS[]`, `AGENDA_EVENTS[]`, stats; re-renderiza grilla, agenda y mapa. Mutacion in-place `.length=0`+`.push()` (BUG-020). |
| `usuario-session.js` | Sesion (`window.ExploraCO`): login por email, guardados/visitas/resenas/voto, XP local, toasts, modal login, hook `window.onExploraCOUpdate()`. |
| `directorio-api-connector.js` | Para directorio-sitio/hostal/comida/evento: fetch `/api/destinos?categoria=` y reemplazo in-place de `PLACES`/`PHOTOS`/`FEAT`. |
| `pagina-connector.js` | Busca destino por slug para paginas estaticas legacy. |
| `resenas-connector.js` | Conector de resenas (paginas legacy). |
| `directorio-api-connector.js` | Idem directorios. |

### 3.3 Paginas publicas (raiz)

| Archivo | Rol |
|---|---|
| `index.html` | Home: hero, destinos, mapa cultural Leaflet, Mi Mapa personal, agenda, Inspirate (blog), login/perfil, gaming (XP/badges/trofeos con null-guards). |
| `directorio.html` | Directorio general (100% estatico, PLACES embebido, SIN connector). |
| `directorio-sitio.html` / `-hostal.html` / `-comida.html` / `-evento.html` | Directorios por categoria con connector de API. |
| `blog.html` | SSR desde `api/utilidades?tipo=blog-lista` (rewrite), listado de posts. |
| `mapas.html` | Catalogo publico de mapas tematicos + detalle con Leaflet. |
| `comunidad.html` | Hub social: Chat (demo), Planes (demo), Ranking (real). |
| `mi-perfil.html` | Perfil del viajero: badges, trofeos, mis lugares, quick actions. |
| `mi-lugar.html` | Dashboard del dueno de un lugar: visitas, guardados, rating, destacado, resenas. |
| `publicar.html` | Formulario publico de 4 pasos para publicar un lugar. |
| `admin.html` | Panel admin (~7.800 lineas): CRUD de destinos, moderacion de solicitudes, resenas, destacado, importar/exportar. |
| `agenda.html` | Agenda completa de eventos (`?cat=evento`). |
| `contacto.html`, `sobre.html` | Paginas informativas. |
| `404.html` | Pagina de error. |
| `<slug>.html` | Paginas de destino ESTATICAS legacy (ej. ciudad-perdida.html, parque-tayrona.html) que ensombrecen rewrites; las dinamicas viven en Neon y se sirven por el motor. |
| `vercel.json`, `netlify.toml`, `robots.txt`, `_headers`, `_redirects` | Config de deploy/SEO. |

### 3.4 Carpetas de trabajo

| Carpeta | Contenido |
|---|---|
| `scripts/` | ~100+ seeds (`seed-*.js`), ~120+ loaders (`load-*-api.js`), ~100+ smoke tests (`smoke_test_*.js`), generadores (`_gen_hostales_pipeline.js`), `fake_neon.js`, utilidades. Patron Fase 9. |
| `db/migrations/` | Migraciones versionadas (ADR-008): 001-006 aprox. (dims/traveller, blog autor, progreso_logros, mapas, etc.). |
| `db/cleanups/` | SQL de limpieza de datos de prueba versionado. |
| `docs/superpowers/specs/` | Design specs por feature (mapas publicos/privados, comunidad unificada, logros/trofeos/voto blog, clustering del mapa, ruta salsera). |
| `exploraco desarrollo/` | AI-DOS Core: PROJECT, BLUEPRINT, DECISIONS, TASKS, NEXT, BUGS_HISTORICOS, Reglas de Oro, fichas de destinos (ficha-*.md), referentes-agenda. |
| `.opencode/skills/` | Skills de opencode: create-dynamic-page, gold-shield, batch-create, research-destination, etc. |
| `.agents/skills/`, `.superpowers/` | Otros skills/plugins. |

---

## 4. Modelo de datos (Neon PostgreSQL)

### 4.1 Tablas

**`destinos`** (principal)
Campos fijos comunes a las 4-5 categorias: `id`, `slug`, `nombre`,
`categoria_slug`, `lead`, `descripcion`, `highlight`, `ciudad`, `region`,
`barrio`, `lat`, `lng`, `whatsapp`, `telefono`, `email`, `web`, `instagram`,
`precio_desde`, `horario`, `emoji`, `hero_bg`, `foto_hero`, `rating`,
`total_resenas`, `status`, `destacado`, `booking`, `hostelworld`, `airbnb`,
`tipo`, `capacidad`, `como_llegar`, `tags` (jsonb), `creado_en`,
`actualizado_en`.

**`destinos_fotos`** - galeria: `id`, `destino_id` (FK), `url`, `caption`,
`orden`, `es_hero`, `creado_en`.

**`destinos_detalles`** - detalles estructurados (principalmente hostal, pero
reutilizable): `destino_id` (PK/FK), `checkin`, `checkout`, `habitaciones`
(jsonb), `amenidades` (jsonb), `faqs` (jsonb), `booking_url`, `hostelworld_url`,
`airbnb_url`, `scores` (jsonb).

**`interacciones`** - resenas, guardados, visitas, rating: `id`, `usuario_id`
(FK, nullable = anonimo), `destino_id` (FK), `tipo`
(`resena`/`guardado`/`visita`/`rating`/`foto`), `rating` (1-5), `texto`,
`xp_ganado`, `activo` (bool, dedup de guardados), `creado_en`.

**`usuarios`** - perfil y gamificacion: `id`, `email` (unique), `auth_id`
(unique, patron `email:<email>`), `nombre`, `xp_total`, `total_resenas`,
`total_guardados`, `progreso_misiones` (jsonb), `progreso_logros` (jsonb),
`foto_url`, `avatar_url`, `ciudad_base`, `ultimo_acceso`, `creado_en`.
NOTA: `nivel` y `badge_actual` NO son columnas persistentes: se derivan en cada
lectura desde `xp_total` (api/usuarios.js) para evitar desincronizacion.

**`mapas`** + **`mapa_destinos`** - mapas tematicos publicos/privados:
`mapas(id, usuario_id, nombre, descripcion, emoji, publico, creado_en)` y
`mapa_destinos(mapa_id, destino_id)` con PK compuesta y CASCADE. Migracion
`db/migrations/006_mapas.sql`.

**`categorias`** - catalogo de categorias (`slug`, `nombre`, `emoji`).
IMPORTANTE: la fila `blog` debe existir o el FK `destinos_categoria_slug_fkey`
rechaza los INSERT de blog con 500 (bug historico resuelto con
`INSERT ... ON CONFLICT (slug) DO NOTHING`).

### 4.2 Nomenclatura obligatoria (evita BUG-007)

Siempre usar: `ciudad` (no `city`), `descripcion` (no `desc`), `telefono` (no
`tel`), `precio_desde` (no `price`), `creado_en` (no `created_at`). Los nombres
incorrectos fueron causa de campos vacios en produccion.

### 4.3 Motor de tags JSONB (modulo central)

El campo `destinos.tags` permite escalar a nuevas categorias sin alterar el
esquema relacional. Esquema por categoria:

- **Sitio:** `tipo_actividad`, `dificultad`, `dificultad_desc`,
  `dificultad_tags[]` (Sprint 2: `{texto, apto:boolean}`), `duracion`, `altitud`,
  `horario_visita`, `precio_entrada`, `distancia`, `como_llegar`, `temporada`
  (legado, rangos de texto), `temporada_matriz` (Sprint 2: objeto
  `{Ene..Dic: ideal|posible|evitar}`), `permisos`, `tours[]` (+ `tipo_tour`,
  `idioma`, `max_personas`), `equipamiento[]`, `entradas[]`, `itinerario[]`,
  `fauna_flora`, `secretos`, `regulaciones`, `checklist_tip`.
- **Hostal:** `tipo_alojamiento`, `politica_cancelacion`, `edad_minima`,
  `mascotas`, `cocina_compartida`, `actividades[]`, `reglas_casa`,
  `que_incluye[]`, `recepcion`, `barrio_descripcion`, `transporte[]`,
  `eventos_hostal[]`.
- **Comida:** `tipo_comida`, `cocina`, `precio_promedio`, `reservas`,
  `menu_destacado[]`, `horario_detallado{}`, `opciones_dieta[]`, `ambiente`,
  `terraza`, `domicilio`, `domicilio_plataformas[]`.
- **Evento:** `fecha_inicio`, `fecha_fin`, `edicion`, `sede`, `organiza`, `lema`,
  `lineup[]`, `agenda[]`, `categorias_entrada[]`, `que_llevar[]`, `prohibido[]`,
  `pulep`. (Nota BUG-019: "capacidad" y "entrada desde" NO son tags; reusan los
  campos genericos `destinos.capacidad` y `destinos.precio_desde`.)
- **Blog:** `temas[]` (array primario, ordenado por prioridad editorial),
  `tema` (derivado = `temas[0]`, compatibilidad), `video_url` (allowlist
  YouTube/Vimeo), `id_autor` (migracion 004).

### 4.4 Protocolo de persistencia: MERGE obligatorio (ADR-003)

Los endpoints de actualizacion NUNCA reemplazan el campo `tags` completo:

```sql
tags = COALESCE(tags, '{}') || $new_tags::jsonb
```

Esto preserva los tags guardados por otras categorias o ediciones anteriores
(Cero Borrado Logico).

### 4.5 Gobernanza de BD (ADR-008)

Toda alteracion de schema/trigger/funcion debe vivir en el repo como archivo
`.sql` versionado (carpeta `db/migrations/`), acumulativo y re-aplicable con
`IF NOT EXISTS`, ANTES de aplicarse a produccion. Queda prohibido ejecutar SQL
de estructura suelto en la consola de Neon sin dejar el archivo. (Caso
fundacional: BUG-021, trigger huerfano `trg_xp_on_interaccion` que rompia los 4
POST de interaccion en produccion.)

---

## 5. Sistema de registro en directorios

Existen **4 vias** para que un destino (sitio, hostal, comida, evento o blog)
entre en los directorios y en el mapa de ExploraCO:

1. **Formulario publico** (`publicar.html` -> `api/publicar-lugar.js` -> draft -> moderacion admin).
2. **Panel admin** (`admin.html` -> `api/admin-destinos.js` -> publicado directo).
3. **Curaduria editorial (patron Fase 9)**: seeds + loaders + smokes en `scripts/`.
4. **Tarjetas estaticas** en los HTML de directorio (PLACES embebido + connector).

### 5.1 Via 1: Formulario publico (publicar.html -> publicar-lugar.js)

**Flujo:**

```
publicar.html (wizard 4 pasos)
  -> validateStep() client-side
  -> submitForm() -> POST /api/publicar-lugar (JSON)
  -> publicar-lugar.js: CAT_MAP/BLOG_TEMAS -> categoria_slug
  -> INSERT destinos (status='draft', destacado=false, verificado=false)
  -> INSERT destinos_fotos (galeria)
  -> POST /api/admin?recurso=notificaciones (email al admin, fire-and-forget)
  -> responde al usuario "El equipo revisara y publicara en 24-48h" + su URL /slug.html
```

**Campos capturados por paso:**

- **PASO 1 (Basico):** `nombre`, `categoria` (chips radio hostal/restaurante/
  sitio/evento), `tipo_alojamiento` (solo hostal), `ciudad` (select ~20 ciudades
  + `__otra__`), `barrio`, `departamento`, `lat`, `lng`, `descripcion_corta`
  (min 30 / max 200 chars), `descripcion_larga` (max 1500), `frase_destacada`
  (highlight), `precio_desde`, `checkin`/`checkout` (solo hostal), `whatsapp`
  (requerido, max 15 digitos), `contacto_nombre`.
- **PASO 2 (Fotos):** `foto_principal` (upload base64 <=5MB o URL),
  `fotos_galeria` (hasta 8 URLs), `instagram`, `sitio_web`, `email`, `telefono`.
- **PASO 3 (Detalles):** amenidades (chips en 4 secciones), booking_url/
  hostelworld_url/airbnb_url, `habitaciones[]` (hostal), campos de sitio
  (`sitio_tipo_actividad`, `sitio_dificultad`, `sitio_duracion`, `sitio_horario`,
  `sitio_precio_entrada`, `sitio_distancia`, `sitio_como_llegar`,
  `sitio_equipamiento[]`, `sitio_temporada[]`, `sitio_permisos`), `faqs[]`.
- **PASO 4 (Revisar/Enviar):** resumen `buildResumen()` + `submitForm()`.

**Logica backend (`api/publicar-lugar.js`):**

- `CAT_MAP` mapea valores UI -> slugs: hostal/hotel/finca/glamping/aparta-hotel/
  posada -> `hostal`; restaurante/cafe/cafeteria/bar -> `comida`; sitio/parque/
  museo/natural/lugar -> `sitio`; evento/festival/concierto -> `evento`.
- `BLOG_TEMAS = ['aventura','gastro','cultura','naturaleza','tips']` fuerza
  `categoria_slug='blog'` (pediria `email` en vez de `whatsapp`).
- `slug()` = nombre+ciudad normalizado NFK + sufijo aleatorio de 4 chars.
- `tags` JSONB: amenidades[], habitaciones[], faqs[], checkin/checkout,
  contacto_nombre, campos de sitio, y para blog `tema` + `video_url` validado
  por `esVideoUrlSegura()` (allowlist YouTube/Vimeo).
- Fotos de galeria -> `destinos_fotos`.
- Notificacion fire-and-forget -> `POST /api/admin?recurso=notificaciones`
  (email al admin via Resend).

**Seguridad (estado actual):** NO hay rate limit ni honeypot/CAPTCHA. Defensas
reales: allowlist de hosts de video, slug sanitizado, precio parseado con
`replace(/\D/g,'')`, CORS abierto, validacion del cuerpo JSON.

### 5.2 Moderacion del draft (admin.html + api/admin.js)

El draft aparece en admin.html en la pantalla **Solicitudes/Moderacion**:

```
admin.html screen-moderacion (filtros Borradores/Aprobados/Archivados)
  -> loadPendientes() -> GET /api/admin?recurso=solicitudes&status=<filtro>
  -> _renderModCard(item) con botones Aprobar/Rechazar/Pendiente/Ver/URL
  -> moderarDestino(id, accion) -> POST /api/admin?recurso=solicitudes {id, accion}
  -> api/admin.js: mapea {aprobar:'published', rechazar:'archived', pendiente:'draft'}
  -> UPDATE destinos SET status=..., destacado=..., actualizado_en=NOW()
```

El badge de solicitudes pendientes (`badge-pending`) se actualiza con
`_checkPendingBadge()` en cada carga. Un draft tambien puede editarse y
publicarse desde el editor: `syncFromNeon()` lo importa como entrada local y
`setStatus('published')` lo publica antes de `savePlace()`.

### 5.3 Via 2: Panel admin (admin.html -> admin-destinos.js)

#### 5.3.1 Estructura de admin.html

- **Sidebar** (`sidenav`): Dashboard, Todos los lugares, Por categoria
  (Hospedajes/Comida/Lugares/Eventos/Blog), Nuevo lugar, Resenas, Solicitudes
  (con badge-pending), Importar, Exportar.
- **Tabs del editor:** GENERAL | FOTOS | CONTENIDO | ESPECIFICO | CONTACTO.
- **`ESPECIFICO`** muestra un sub-panel segun `categoria_slug`:
  `especifico-hostal`, `especifico-comida`, `especifico-sitio`,
  `especifico-evento`, `especifico-blog`.
- Botones top: "Guardar borrador" (`saveAsDraft`) y "Guardar y publicar"
  (`savePlace`).

#### 5.3.2 Motor generico de tags (TSK-012) - CLAVE para nuevas categorias

Dos objetos de configuracion en admin.html (aprox. L2531-2675) reemplazan la
edicion manual de `collectPlace()`/`_placeToAPI()`:

- **`CATEGORY_TAG_FIELDS`** (campos escalares por categoria): cada entrada es
  `{ key, localKey, selector, multi }`. Ejemplos por categoria:
  - `sitio`: tipo_actividad, dificultad, dificultad_desc, duracion, altitud,
    temporada (multi), precio_entrada->entradaPrecio, distancia->distancia_sitio,
    como_llegar->como_llegar_sitio, permisos->permisos_sitio, temporada_nota,
    fauna_flora, secretos (collector collectSitioSecretos), regulaciones,
    checklist_tip.
  - `hostal`: tipo_alojamiento, reglas_casa, edad_minima, mascotas,
    cocina_compartida, politica_cancelacion->cancelacion, recepcion,
    precio_booking_ref->precioBooking, booking_mensaje->bookingMsg,
    barrio_descripcion->barrioDesc.
  - `comida`: tipo_comida, cocina, precio_promedio, ambiente, terraza, reservas,
    domicilio, rappi, ifood, domicilio_zona->deliveryZona.
  - `evento`: fecha_inicio->fechaIni, fecha_fin->fechaFin, edicion, sede.
  - `blog`: temas (select multiple, `multi:true`), video_url, id_autor.
- **`CATEGORY_TAG_LISTS`** (listas con builder propio):
  - `sitio`: tours (collectTourItems), equipamiento->checklist
    (collectChecklistItems), entradas (collectSitioEntradas), itinerario
    (collectSitioItinerario), dificultad_tags->dificultadTags
    (collectDificultadTags).
  - `hostal`: actividades, que_incluye, transporte->transport,
    eventos_hostal->hostalEvents.
  - `comida`: menu_destacado->menu, opciones_dieta, domicilio_plataformas.
  - `evento`: lineup, agenda->agendaEvento, categorias_entrada->categoriasEntrada,
    que_llevar->queLlevar, prohibido->prohibidoEvento.

**Funciones del motor:**

| Funcion | Rol |
|---|---|
| `applyCategoryTagFields(p, cat)` | READ: vuelca `p` (del backend) a los inputs DOM. Usado por `loadForm()`. |
| `collectCategoryTagFields(p, cat)` | WRITE: lee los inputs DOM y los escribe en `p`. Usado por `savePlace()`. |
| `_buildTagsObj(p)` | Arma el objeto `tags` JSONB del payload. Recorre FIELDS/LISTS automaticamente + casos especiales: blog `tema=temas[0]`, `temporada_matriz`, `horario_detallado`, bloques base (checkin/checkout/habitaciones/amenidades/faqs). |
| `_applyTagsToLocal(local, tags, cat)` | Desanida `tags` de Neon -> objeto local `p` (READ desde DB). |

#### 5.3.3 Flujo guardar/editar en admin

```
Carga: syncFromNeon() -> GET /api/admin-destinos?limit=500 (Bearer)
       -> mapea slugs locales -> UUIDs (_localToUUID) y crea entradas para
          destinos en Neon que no existen localmente
Editar: editPlace(id) -> loadForm(p) -> updateCatUI() -> especifico-<cat>
Nuevo: newPlace() -> currentId=Date.now(), editorStatus='published', clearForm()
Guardar: savePlace() -> validateForm() (exige nombre/categoria/ciudad)
         -> arma p base + collectCategoryTagFields(p, cat)
         -> places.push/update -> savePlaces() (localStorage)
         -> _syncToNeon(p) -> _placeToAPI(p) -> PUT (si UUID) / POST (si nuevo)
         -> _syncFotosGaleria() escribe destinos_fotos
Borrador: saveAsDraft() -> editorStatus='draft' + savePlace()
```

- `_placeToAPI(p)` mapea `p` al payload con nombres exactos del schema Neon:
  incluye `foto_hero` (photos[0]), `galeriaUrls` (photos[1..]), `tags:
  _buildTagsObj(p)`, `status`, `destacado`, `habitaciones`, `amenidades`,
  `scores`, `faqs`, `checkin/checkout/booking_url`.
- Otras acciones: `deletePlaceId` (DELETE en Neon + local), `toggleDestacadoId`
  (POST/DELETE `/api/admin?recurso=destacado` con plan `mensual`),
  `duplicatePlaceId`, `setStatus` (pills published/draft/archived), `renderTabla`
  (filtros por categoria/status).

#### 5.3.4 api/admin-destinos.js (CRUD)

- **Auth Bearer** (L11-14): compara `Authorization` contra
  `process.env.ADMIN_SECRET || 'exploraco12345'`; CORS amplio; 401 si falla.
- **GET:** `?id=` -> fila con JOIN `destinos_detalles`; `?limit=&offset=&status=`
  -> listado paginado (max 500) con LEFT JOIN + COUNT.
- **POST:** requiere `slug`+`nombre`; slug limpiado; `safeJSON(b.tags)`;
  INSERT con `ON CONFLICT (slug) DO UPDATE SET nombre=EXCLUDED.nombre,
  actualizado_en=NOW()`; luego upsert de `destinos_detalles` y
  `destinos_fotos` (`ON CONFLICT DO NOTHING`).
- **PUT:** SET dinamico solo con campos presentes (`fieldMap`); **merge JSONB**
  `tags = COALESCE(tags,'{}'::jsonb) || $N::jsonb`; `destinos_detalles` con
  `COALESCE(EXCLUDED.x, ...)` para no pisar; `destinos_fotos`.
  LIMITACION CONOCIDA: ignora valores vacios (no se puede vaciar un campo ya
  guardado, ej. quitar un `video_url`) - mejora en backlog.
- **DELETE:** borra en cascada `destinos_fotos`, `destinos_detalles`,
  `interacciones`, luego `destinos`.
- `status` acepta `draft|published|archived`; `destacado` como boolean.

#### 5.3.5 Patron de 7 pasos para anadir una categoria nueva (actualizado)

Los pasos 4 y 5 quedaron superados por el motor generico (TSK-012). El patron
vigente es:

1. Definir los campos especificos en `tags` JSONB (seccion 4.3).
2. Agregar sub-tabs y paneles en admin.html dentro de `especifico-X`
   (`cat-editor-tabs` + `cat-panel`), verificando balance de divs antes y
   despues.
3. Agregar funciones JS con **prefijo de categoria** (ej: `addHostalHabitacion`,
   `addComidaPlato`, `addLineupRow`, `addAgendaRow`) para evitar el bug
   historico de funciones duplicadas (BUG-006/018/019).
4. **Registrar los campos escalares en `CATEGORY_TAG_FIELDS.<cat>`** (el
   `collectCategoryTagFields()` ya los recorre).
5. **Registrar las listas en `CATEGORY_TAG_LISTS.<cat>`** (`_buildTagsObj()` ya
   los recorre).
6. Agregar las secciones condicionales en `api/pagina-destino.js` (leer con
   `safeJSON(tags.campo)`, ensamblar solo si hay datos).
7. Actualizar `loadForm()` para precargar los datos al editar (los escalares via
   `applyCategoryTagFields()`; los arrays/listas se precargan a mano, uno por
   contenedor).

### 5.4 Via 3: Curaduria editorial - patron Fase 9 (seed + loader + smoke)

Es el metodo usado para crear la mayoria de las ~100 paginas dinamicas en
produccion. Para cada slug se crean 3 archivos en `scripts/`:

#### 5.4.1 Seed (`scripts/seed-<slug>.js`)

- Exporta constantes: `SLUG`, `HERO`, `PHOTOS[]`, `BASE{}` (datos de la columna
  destinos), `TAGS{}` (objeto JSONB de la categoria), `FAQS[]`.
- SQL de upsert idempotente: `INSERT ... ON CONFLICT (slug) DO UPDATE SET ...`
  con merge `tags = COALESCE(destinos.tags,'{}')||EXCLUDED.tags`.
- Inserta `destinos_detalles.faqs` y `destinos_fotos` con `es_hero` en la
  posicion 0.
- Modo `--dry` para imprimir el SQL sin ejecutar. Usa `DATABASE_URL` directo
  contra Neon (para quien tenga la URL).

#### 5.4.2 Loader (`scripts/load-<slug>-api.js`)

- Idempotente: **DELETE previo** (si existe por slug) + **POST**
  `/api/admin-destinos` con Bearer `exploraco12345` contra
  `https://exploraco.vercel.app`.
- `toPlacePayload()` replica el payload exacto de admin.html
  (`status:'published'`, `destacado:true`, `tags`, `faqs`, `habitaciones`,
  `amenidades`, `checkin`, `booking_url`...). Para hostales extiende el payload
  con top-level `checkin`, `checkout`, `habitaciones`, `amenidades`,
  `booking_url`, `hostelworld_url`, `airbnb_url:''` (admin-destinos los escribe
  en `destinos_detalles`).

#### 5.4.3 Smoke test (`scripts/smoke_test_<slug>.js`)

- Sandbox **Node vm**: intercepta `@neondatabase/serverless` con
  `scripts/fake_neon.js`, lee `api/pagina-destino.js`, lo ejecuta en
  `vm.runInContext` con un sandbox, y expone `buildHTML`.
- Llama `buildHTML(d, det, fotos, resenas)` con los datos del seed y verifica
  por categoria (habitaciones, check-in/out, reglas de casa, actividades,
  transporte, amenidades...) **mas balance de divs**.
- **Hallazgo clave para smokes hostal:** el fallback det->tags vive en el
  wrapper de produccion de pagina-destino.js, NO dentro de `buildHTML()`. Los
  smokes de hostal deben construir `det = { habitaciones, amenidades, checkin,
  checkout, ... }` desde el seed o las secciones no se renderizan.
- **Helper `inc()`:** `esc()` codifica los acentos como entidades numericas
  (`\u00ed` -> `&#237;`), asi que un `html.includes('música')` falla. Los smokes
  comparan tambien la version entity-encoded:
  `html.includes(enc(s)) || html.includes(s)`.

#### 5.4.4 Escudo GOLD (obligatorio antes de desplegar)

1. `node --check <archivo>` -> debe pasar limpio (ADR-005).
2. **ASCII-Safety:** 0 bytes > 127, 0 backticks, 0 doble escape `\\u`.
3. **Balance de divs:** `<div` == `</div>` (por zona de categoria en admin.html,
   o en el HTML generado por buildHTML en smokes).

Verificar en produccion tras el deploy: las URLs `.html` = 200 con el contenido
correcto, `/api/destinos?cat=<categoria>` lista el slug nuevo, el sitemap lo
incluye, y las fotos responden HTTP 200 (patron BUG-022: verificar URLs de
Wikimedia con `iiurlwidth=960` y hash real de directorio).

### 5.5 Via 4: Tarjetas estaticas en los directorios publicos

`directorio.html`, `directorio-sitio.html`, `directorio-hostal.html`,
`directorio-comida.html` y `directorio-evento.html` son HTML estaticos con:

- `var PLACES = [...]` (JSON embebido, en la zona ~L335),
- `var FEAT = [...]` (ids destacados),
- `var PHOTOS = {id: url}`.

**Como se listan:** `renderDir()` filtra con `getFiltered()`, ordena con
`sorted()`, pagina con `PAGE_SIZE`, y renderiza tarjetas `.dcard` con
`PHOTOS[p.id]` como imagen, `FEAT` para badge destacado, `stars(r)`, precio y
enlace `p.slug+'.html'`.

**Connector:** `directorio-sitio/hostal/comida/evento` incluyen
`directorio-api-connector.js` (v7) que hace `fetch('/api/destinos?limit=500&_t=
...&categoria=<cat>')`, transforma con `toPlace()` y **reemplaza in-place**
`PLACES`/`PHOTOS`/`FEAT`/`PL`/`DEST_FEATURED_IDS`/`DEST_PHOTOS` via `replArr`/
`replObj` (mutacion `.length=0`+`.push`), re-renderiza `renderDir()` y activa la
busqueda. **`directorio.html` (general) NO tiene connector**: es 100% estatico y
los slugs nuevos no aparecen hasta que alguien edita su PLACES a mano.

**Como agregar una tarjeta manualmente:** insertar un objeto en `PLACES` con
`{ id, slug, name, cat, city, region, rating, rev, price, emoji, hero_bg,
photos:[{type:'photo',url,cap}], lat, lng }`, registrar la URL en `PHOTOS[id]`
y anadir el `id` a `FEAT` si va destacado. Si el archivo tiene connector, esos
datos se sobreescriben en runtime desde la API.

---

## 6. Sistema de guardado de mapas

El sistema de mapas tiene 3 capas que conviven en index.html, mapas.html y
api/interacciones.js:

1. **Mapa cultural de Colombia** (index.html): mapa global de todos los
   destinos con clustering por proximidad.
2. **Mi Mapa personal / Mi Viaje** (index.html): el "bag" del usuario con
   guardados (heart) y visitados ("Estuve aqui"), en doble via localStorage +
   Neon.
3. **Mapas tematicos publicos/privados** (index.html + mapas.html): el usuario
   CREA y GUARDA mapas con nombre/emoji/descripcion, los hace publicos/privados
   y los comparte por URL.

### 6.1 Mapa cultural de Colombia (index.html + api/destinos.js)

**Backend (`api/destinos.js`):** `modo=mapa` devuelve la query minima
(`id, slug, nombre, categoria_slug, ciudad, region, lat, lng, emoji, hero_bg,
foto_hero, rating, total_resenas, destacado`) filtrada por
`lat IS NOT NULL AND lng IS NOT NULL AND lat != 0 AND lng != 0`, ordenada por
`destacado DESC, rating DESC NULLS LAST`, e incluye `color: PIN_COLORS[cat]`
("requerido por Leaflet markers"). NO hay clustering en servidor (todo es
client-side).

`PIN_COLORS`: `hostal:#2196F3`, `comida:#FF9800`, `sitio:#4CAF50`,
`evento:#A855F7`, `blog:#EC4899`.

**Frontend (index.html):**

| Funcion | Rol |
|---|---|
| `initMapaSection()` | Crea `L.map('leaflet-map')` (tiles **CARTO voyager**, centro `[4.711,-74.072]` zoom 14), `mapaClusterLayer=L.layerGroup()`. Si el mapa ya existe, solo `refreshMapaMarkers()`. |
| `refreshMapaMarkers()` | Borra `mapaMarkers`, recorre `MAPA_PLACES`, crea markers teardrop (`divIcon` 30px coloreado por `p.color`), popup con stars + "Ver lugar" + boton guardar (`toggleMapaSave`), setea `mapaPlaces` y llama `filterMapaPins` + `renderMapaList`. |
| `reclusterMapa()` | **Clustering custom por proximidad de pixeles** (greedy, centroide <=40px con `map.project`). Cluster de 1 -> pin individual; >1 -> circulo con conteo + emoji dominante; click -> `flyTo(zoom+2)`. NO usa Leaflet.markercluster (descartado por CDN). |
| `onMapaMoved()` | Debounce 150ms -> `reclusterMapa()`; reabre popup pendiente. |
| `firstIsolatedZoom(id, startZ)` | Primer zoom donde el lugar queda aislado. |
| `geolocateMapa(btnEl)` | `navigator.geolocation` -> `flyTo(userPos,16)` + reordena lista por cercania (`haversineKm`, `recomputeDists`). |
| `resetMapaColombia()` | `flyTo([5.5,-74.5],6)`. |
| `setMapaActive(id)` | Nunca baja el zoom (`max(curZ, firstIsolatedZoom)`), pan/fly + popup. |
| `toggleMapaSave(id,el)` | Toggle de `mmSaved` + localStorage + `renderMyMap()`. NO es reactivo a Neon por si solo (el wrapper si lo es). |
| Init lazy | `IntersectionObserver` (rootMargin 300px) + listener scroll + timeout 2s -> `initMapaSection()`. |

**Poblacion de datos:** `index-api-connector.js` repuebla `MAPA_PLACES[]` con
`toMapPlace()` (que SIEMPRE incluye `color`, requerido por initMapaSection) y
tras el fetch re-renderiza: si `window.mapaMap` existe -> `refreshMapaMarkers()`;
si no -> `initMapaSection()`; y SIEMPRE `renderMyMap()` (fix TSK-070).

### 6.2 Mi Mapa personal / Mi Viaje (index.html + usuario-session.js + interacciones.js)

**Concepto de doble via:**

- **Local (inmediato):** `localStorage['mm_saved']` y `localStorage['mm_visited']`
  guardan **slugs** (formatos legacy usaban ids numericos; `_migrarMM()` los
  convierte a slugs).
- **Neon (durable, con sesion):** tabla `interacciones` con `tipo='guardado'`
  (activo=true) y `tipo='visita'`.

**Flujo de guardar un destino:**

```
Click heart -> toggleDestSave() (normaliza a slug, guarda mm_saved local,
              renderMyMap, y si hay sesion llama guardarDestino(uuid))
  -> window.ExploraCO.guardarDestino(uuid)
       sin sesion -> mostrarLogin() (modal)
       con sesion -> POST /api/interacciones {tipo:'guardado', usuario_id, destino_id}
         -> dedup por activo (si activo=true: ya_guardado, sin XP;
            si activo=false: reactiva la fila con xp:0 - anti-fraude;
            si no existe: +5 XP + misiones + logros)
  -> toasts + updatePointsUI()
```

**Flujo de marcar visitado:**

```
boton "Estuve aqui" -> mmToggleVisited wrapper -> marcarVisitado(uuid)
  -> POST /api/interacciones {tipo:'visita'} -> +20 XP, dedup ya_visitado
  -> guarda slug en mm_visited local
```

**Hidratacion de la base de datos** (`_hidratarGuardadosDB()` en index.html):
con sesion, llama `ExploraCO.cargarMiMapa()` + `cargarVisitas()` (ambos via
`GET /api/interacciones?tipo=mapa&usuario_id=`), une los slugs con `mezclarEn`
y re-renderiza. Idempotente con el flag `_mmHidratado`. Si no hay sesion o
`MAPA_PLACES` esta vacio, sale SIN marcar el flag (reintenta).

**Al hacer login:** `sincronizarGuardados()` (usuario-session.js) sube los
guardados/visitas locales (slugs -> UUIDs) a Neon con POST de cada uno.

**Otras funciones de Mi Mapa:**

| Funcion | Rol |
|---|---|
| `renderMyMap()` | Actualiza contadores, empty-state, `initMMLeaflet()` (tiles **CARTO dark**), `updateMMMarkers()` (verde `#22C55E` = Visitado, dorado `#E8A020` = Guardado; divIcon 36px con emoji; popup con "Ver ->"; fitBounds/setView), badge de tab, `renderMMList()`. |
| `renderMMList()` | Filtra por saved/visited/cat o por mapa tematico; **limpia `cont.innerHTML=''` SIEMPRE** antes del forEach (fix de duplicados TSK-070); botones "Ya fui"/"Desmarcar" y "Quitar". |
| `renderMMStats()` | Estadisticas por ciudad/categoria. |
| `mmRemove(id)` | Tambien reactivo a Neon (`quitarGuardado`/`quitarVisita`). |
| `shareMyMap()` | Genera URL `?mapa=slug1,slug2,...` + texto via `navigator.share`/clipboard. El loader de mapa compartido (`?mapa=slugs`) lo auto-carga al abrir la URL. |
| `clearMyMap()` | Confirma, resuelve UUIDs, vacia `mmSaved`/`mmVisited`, `localStorage.removeItem(...)` y purga Neon fire-and-forget. |
| `_uuidDeId` / `_slugDeId` / `_uuidDeSlug` | Traductores id posicional <-> slug <-> UUID real de Neon. |
| `window.onExploraCOUpdate` | Hook global (disparado por usuario-session tras login/XP): llama `updatePointsUI()`, `_migrarMM()`, `_hidratarGuardadosDB()`, `cargarMisMapas()`. |

**Backend de guardado/visita (api/interacciones.js):**

- `POST tipo=guardado` (L899-945): requiere `usuario_id`. Dedup por
  `SELECT ... WHERE destino_id AND usuario_id AND tipo='guardado' LIMIT 1`.
  Nuevo -> `xp_ganado=5`, INSERT, `UPDATE usuarios SET xp_total=xp_total+5,
  total_guardados=total_guardados+1`, evalúa misiones/logros.
- `POST tipo=quitar_guardado` (L948-962): **Cero Borrado Logico** - `UPDATE
  interacciones SET activo=false`. Nunca DELETE.
- `POST tipo=visita` (L965-996): `+20 XP`, requiere `usuario_id` (cierra el
  vector de XP infinito), dedup `ya_visitado`.
- `POST tipo=quitar_visita` (L1004-1013): borrado fisico (el XP ya se otorgo).
- `GET tipo=mapa&usuario_id` (L460-484): guardados activos + visitas
  confirmadas como destinos completos con lat/lng.

**Riesgo conocido (backlog):** `mm_saved`/`mm_visited` usan slugs (antes ids
posicionales dependientes del ORDER BY del API). Fix estructural = guardar
UUIDs (refactor que toca varias paginas).

### 6.3 Mapas tematicos publicos/privados (el "guardado de mapas" en si)

Diseño aprobado en `docs/superpowers/specs/2026-09-05-mapas-publicos-privados-
design.md` (spec pendiente de revision completa, backend y frontend de index
implementados).

**Modelo de datos:** tablas `mapas` + `mapa_destinos` (migracion
`db/migrations/006_mapas.sql`, `CREATE TABLE IF NOT EXISTS`, PK compuesta,
CASCADE, indices `idx_mapas_usuario` y `idx_mapas_publico_creado`). Sin XP, sin
columna slug (detalle por `?id=<uuid>`).

**Backend (api/interacciones.js):**

| Tipo | Rol |
|---|---|
| GET `mapas_mios&usuario_id` | Mapas del usuario (para las pills de "Mis mapas"). |
| GET `mapas_publicos` | Catalogo publico (para mapas.html). |
| GET `mapa_detalle&id` | Detalle; si el mapa es privado y el request no es del dueno -> `{error:'No autorizado'}` (403). |
| POST `mapa_crear` | Crea mapa (nombre, emoji, descripcion, publico). |
| POST `mapa_editar` | Edita (incluye toggle `publico`). |
| POST `mapa_eliminar` | Borra mapa. |
| POST `mapa_agregar_destino` / `mapa_quitar_destino` | Gestiona destinos; dedup con `ON CONFLICT DO NOTHING` -> respuesta `ya_incluido`. |

**Frontend (index.html, L1931-2253):**

| Funcion | Rol |
|---|---|
| `cargarMisMapas()` | `GET tipo=mapas_mios` -> `renderMisMapas()`. |
| `renderMisMapas()` | Pills `emoji + nombre + n + 🔒/🌍` + editbar (toggle publico, editar, compartir, "✕ Mi Mapa"). |
| `selectMapa(id)` | Selecciona un mapa tematico (o Mi Mapa con `null`). |
| `cargarMapaDestinos(id)` | `GET tipo=mapa_detalle`; cachea `uuids`/`slugs`. |
| `_perteneceMapa(p)` | Determina si un lugar pertenece al mapa seleccionado. |
| `toggleMapaPubl(id, pub)` | POST `mapa_editar {publico}`. |
| `compartirMapa(id)` | Link `.../mapas.html?id=<uuid>` (solo si es publico), clipboard. |
| `nuevoMapa()` / `abrirModalMapa(mapaId)` / `guardarModalMapa()` | Modal crear/editar. |
| `eliminarMapa(id)` | POST `mapa_eliminar`. |
| `mostrarPopoverMapas(btn, slug)` | Popover "Anadir a mapa..." con checkboxes + "＋ Nuevo mapa". |
| `mapaCheckboxMap(mapaId, uuid, checked)` | POST `mapa_agregar_destino` / `mapa_quitar_destino`. |

**mapas.html (catalogo publico + detalle):** pagina estatica que consume solo
`api/interacciones.js` (cero slots API nuevos):

- `cargarGrid()` -> `GET tipo=mapas_publicos`; renderiza `.m-card` (emoji,
  nombre, descripcion, autor, nº de destinos, fecha). Estado vacio propio.
- `cargarDetalle(id)` -> `GET tipo=mapa_detalle&id=`; si
  `error==='No autorizado'` muestra "Este mapa es privado" (🔒). Pinta header +
  `renderDetLista` (items con enlace a `slug.html`) + `initDetMap` (Leaflet
  **CARTO dark**, markers `_markerIcon(cat)` circulares de 20px coloreados,
  popup, `fitBounds`, si 1 solo pin `setZoom(13)`, fallback Colombia
  `[4.5709,-74.2973]` zoom 5). NO usa clustering.
- Init: lee `?id=` del query -> `cargarDetalle(id)` o `cargarGrid()`.

**Pendientes conocidos de mapas tematicos:**

- `mi-perfil.html` NO tiene la seccion "Mis mapas" (solo "Mis lugares" via
  `tipo=mapa`). La spec pedia esa seccion en el perfil.
- El popover de "Anadir a mapa" solo aplica a tarjetas de index.html; las
  ~92+ paginas de destino servidas por pagina-destino.js quedan fuera.

---

## 7. Sistema social

El sistema social se apoya en una sesion ligera (email sin password) y en la
tabla `interacciones` como columna vertebral. Cubre: reseñas con dimensiones,
rating/voto rapido, guardados, visitas, comunidad, perfiles, ranking y
notificaciones al admin.

### 7.1 Sesion de usuario (usuario-session.js)

- **Persistencia:** `localStorage['exploraco_user']` (`SESSION_KEY`).
- **Login por email sin password:** `POST /api/usuarios` con
  `auth_id = 'email:'+email`, upsert `ON CONFLICT (auth_id) DO UPDATE`. Crea el
  usuario si no existe (login y registro son el mismo flujo).
- **`window.ExploraCO`** es la API global expuesta. Metodos principales:

| Metodo | Endpoint | Notas |
|---|---|---|
| `loginConEmail(email, nombre)` | POST /api/usuarios | Al entrar llama `sincronizarGuardados()`. |
| `cerrarSesion()` | - | Limpia sesion + `mm_saved`. |
| `sincronizarGuardados()` | POST /api/interacciones | Sube `mm_saved`/`mm_visited` locales (slugs->UUID). |
| `cargarMiMapa()` / `cargarVisitas()` | GET tipo=mapa | Baja guardados/visitados de Neon. |
| `guardarDestino(uuid)` | POST tipo=guardado | Sin sesion -> modal login. |
| `publicarResena(uuid, rating, texto, nombre, dims, travellerType)` | POST tipo=resena | Sin sesion pero con nombre -> crea sesion temporal `nombre@explorador.co`. |
| `toggleGuardado(uuid, btn)` / `estaGuardado(uuid)` | POST/GET | Toggle + XP. |
| `marcarVisitado(uuid)` / `quitarVisita(uuid)` | POST tipo=visita / quitar_visita | - |
| `votar(uuid, rating)` / `obtenerMiVoto(uuid)` | POST tipo=rating / GET mi_rating | Sin sesion -> `{necesita_login:true}` (NO crea sesion temporal). |
| `mostrarLogin` / `mostrarToast` | - | Modal login dinamico (`#login-modal`) y toast (`#exploraco-toast`). |
| `actualizarUI()` | - | Actualiza header login/perfil y dispara `window.onExploraCOUpdate()`. |

- **Helpers de gaming locales:** `sumaMisionesXp`, `aplicarDesbloqueos`,
  `mostrarMisionesToast`, `sumaLogrosXp`, `mostrarLogrosToast` (toast "Trofeo
  desbloqueado" con desfase para no pisar los de misiones).
- **`window.onExploraCOUpdate`** es el hook global que cada pagina usa para
  refrescar su UI tras login/XP/guardado.

### 7.2 Reseñas (POST/GET tipo=resena)

**POST `tipo=resena`** (api/interacciones.js L772-896):

- Acepta `rating || puntuacion` (1-5), `texto`, `dims` (JSONB con 6 dimensiones
  de la reseña V2, `DIM_BY_CAT` por categoria), `traveller_type`.
- **Dedup simetrico (ADR-007):** si el usuario ya califico el destino con
  `tipo IN ('resena','rating')` -> responde **409 `ya_votado`** + `voto_previo`.
- Guarda `usuario_nombre` como prefijo `[Nombre] ` en el texto (no existe
  columna de nombre en interacciones).
- **XP:** 10 si el texto (tras quitar el prefijo) tiene <=50 chars; 25 si >50.
- Tras insertar, **recalcula el destino** (ver 7.4), suma XP al usuario y evalúa
  misiones + logros.
- Dispara notificacion email al admin (fire-and-forget).

**GET `tipo=resenas&destino_id`:** ultimas 20 con `LEFT JOIN usuarios` para
nombre + badge del autor. **GET `tipo=dims_avg&destino_id`:** promedios por
dimension (barras de puntuacion).

### 7.3 Rating / voto rapido (POST tipo=rating) - ADR-007

- Widget `#qr-stars` renderizado por `api/pagina-destino.js` en TODAS las
  categorias (desde ADR-012 tambien en blog, con copy "Califica este articulo"
  y contador "N opiniones"; para destinos "N resenas").
- **Requiere sesion** (`400 Se requiere usuario_id` si falta).
- **Dedup simetrico:** mismo 409 que la resena (quien voto rapido no puede
  reseñar y viceversa).
- **+10 XP**, recalculo del destino (7.4), misiones + logros.
- **GET `tipo=mi_rating`:** precarga el voto del usuario en el widget.

### 7.4 Recalculo de rating/total_resenas (alineacion AVG/COUNT)

Tras cada `resena`, cada `rating`, y tambien en el DELETE de resena del admin:

```sql
UPDATE destinos SET
  rating = (SELECT ROUND(AVG(rating)::numeric,2) FROM interacciones
            WHERE destino_id=$1 AND tipo IN ('resena','rating') AND rating IS NOT NULL),
  total_resenas = (SELECT COUNT(*) FROM interacciones
                   WHERE destino_id=$1 AND tipo IN ('resena','rating')),
  actualizado_en = NOW() WHERE id=$1
```

Ambos operan sobre `resena+rating` para que el promedio y el contador queden
alineados (corrige el desfase historico ADR-007). Destinos nuevos parten con
rating/total_resenas en 0 (ADR-009: no hardcodear rating; el `destacado` es el
mecanismo editorial de visibilidad).

### 7.5 Paginas de destino (api/pagina-destino.js) - superficie social

Cada pagina dinamica (pagina-destino.js) renderiza e inyecta via `onclick`
fisico (Regla de Oro 5):

- `submitRv` -> `window.ExploraCO.publicarResena` (formulario con dims +
  traveller_type en no-blog; simplificado a estrellas+nombre+comentario en blog).
- `votarDID` -> `window.ExploraCO.votar`.
- `precargarMiVoto` -> `window.ExploraCO.obtenerMiVoto`.
- `toggleGuardar` -> `window.ExploraCO.toggleGuardado`.
- `marcarVisitadoBtn` -> `window.ExploraCO.marcarVisitado`.
- Autoregistro de visita de pagina -> `/api/utilidades?tipo=visitas` (contador
  no gamificado).
- Carga `<script src="/usuario-session.js">`.

### 7.6 comunidad.html - hub social

- **Gate sin sesion:** CTA llama `window.ExploraCO.mostrarLogin()` +
  "Entrar sin sesion - modo demo".
- **User bar:** avatar, nombre, nivel (XP_LEVELS local), barra XP, stats
  XP/Badges/Guardados/Visitados.
- **Tabs reales: 💬 Chat, 🗺️ Planes, 🏆 Ranking** (NOTA: la spec
  2026-09-07 de comunidad unificada describia otros tabs; el codigo real tiene
  estos 3).
  - **Chat = demo local SIN backend** (`CHAT_ROOMS`, `MOCK_MESSAGES`,
    `renderChatRooms`, `openChatRoom`, `sendChatMsg`). Sin XP, sin persistencia.
  - **Planes = demo local** (`PLANES_DATA`, `joinPlanComm`, `createPlan` con
    prompt). Sin backend.
  - **Ranking = REAL:** `cargarLeaderboard()` -> `GET /api/usuarios?tipo=
    leaderboard&limit=20`, con fallback a `MOCK_LB`.

### 7.7 mi-perfil.html - perfil del viajero

- **Gate:** con sesion muestra `#profile`; sin sesion pide login.
- Hero con avatar (iniciales/foto), nombre, email, nivel, barra XP.
- Stats: XP total, Guardados, Visitados, Reseñas.
- **Badges:** grilla con `XP_BADGES` local (`renderBadges`).
- **Trofeos:** `cargarTrofeos()` -> `GET tipo=logros`; muestra conteo "X / 16"
  y tier. BUG LATENTE: usa `t.rareza_global` (L299) pero el backend devuelve
  `rareza_pct`.
- **Mis lugares:** `cargarMisLugares()` -> `GET tipo=mapa` (guardados +
  visitados), fallback a localStorage.
- **Siguientes pasos:** `renderQuickActions` sugiere acciones con XP.
- Editar nombre (POST /api/usuarios) y cerrar sesion.

### 7.8 mi-lugar.html - dashboard del dueno de un lugar

No es social de viajero: es estadisticas de un lugar para su propietario (link
"← Admin"):

- Stats: visitas totales, visitas 30d, guardados (heart), rating.
- Grafica de visitas 30 dias (`renderChart`).
- **Perfil destacado** (`renderDestacado`): planes pagos Mensual $49.000 /
  Trimestral $120.000 / Anual $390.000, activables por WhatsApp. Backend:
  `api/admin?recurso=destacado` (destacado_hasta en tags).
- **Reseñas recientes:** `GET /api/admin?recurso=resenas&slug=X&limit=5`.
- APIs: `api/utilidades?tipo=visitas` y `api/admin?recurso=destacado`.

### 7.9 api/admin.js - recursos admin relacionados con lo social

| Recurso | GET | POST |
|---|---|---|
| `solicitudes` | Lista destinos por status (draft/published/archived) para moderar. | `{id, accion}` con mapeo aprobar->published / rechazar->archived / pendiente->draft. |
| `resenas` | Lista con stats (total, rating_promedio, positivas >=4, negativas <=2); extrae el nombre del prefijo `[Nombre] `. | DELETE recalcula rating/total_resenas (7.4). |
| `destacado` | Planes del perfil destacado. | Activar/desactivar con `destacado_hasta`. |
| `notificaciones` | - | Envia email Resend al admin (`admin@exploraco.co`) por reseña nueva y solicitud. |

### 7.10 Lo que NO existe (no implementar sin ADR)

- Seguir usuarios / followers / likes: no existe (0 resultados en el codigo).
- Foro / comentarios: solo "opiniones" en blog = reseñas sobre
  `categoria_slug='blog'` (terminologia `opinion` vs `resena` en
  pagina-destino.js).
- Mensajes / chat: solo demo local en comunidad.html.
- Notificaciones in-app para usuarios: solo emails al admin.

---

## 8. Sistema gaming (gamificacion)

El gaming esta implementado como **codigo estatico server-side** (catalogos
MISIONES/LOGROS dentro de `api/interacciones.js`, evaluados en la misma
invocacion de cada POST con XP - no hay endpoints nuevos, presupuesto 8/8), con
progreso por usuario en `usuarios.progreso_misiones` / `usuarios.progreso_logros`
(merge `||` segun ADR-003). Los niveles y badges se derivan en cada lectura,
nunca se guardan.

### 8.1 XP por accion

| Accion | XP | Dedup / anti-fraude |
|---|---|---|
| `resena` corta (<=50 chars) | 10 | Dedup simetrico 409 (resena+rating) |
| `resena` larga (>50 chars) | 25 | Idem |
| `guardado` | 5 | Dedup por `activo` (reactiva fila con xp:0, no re-paga) |
| `visita` | 20 | Dedup usuario+destino (`ya_visitado`), requiere `usuario_id` |
| `rating` (voto rapido) | 10 | Dedup simetrico 409, requiere sesion |

Cabecera de `api/interacciones.js` documenta los 3 fixes de fraude de XP de la
v3 (visita/guardado/resena).

### 8.2 Niveles (6) - api/usuarios.js

| Nivel | Umbral XP |
|---|---|
| Viajero novato | 0 |
| Explorador | 100 |
| Aventurero | 300 |
| Embajador Colombia | 600 |
| Leyenda viajera | 1000 |
| Maestro ExploraCO | 2000 |

- `calcularNivel(xp)` y `conNivel(row)` derivan `nivel` y `badge_actual` en cada
  lectura (NUNCA se guardan, evita desincronizacion).
- Los mismos umbrales existen en `XP_LEVELS` de index.html (mantener sincronizados).

### 8.3 Badges (7) - XP_BADGES en index.html

`primer_lugar`, `explorador5`, `viajero10`, `primer_resena`, `critico`,
`visitado3`, `colombiano`. Se renderizan con null-guards (el modulo social
embebido fue removido con la comunidad unificada; los contenedores `#pts-xp`,
`#badges-grid`, `#logros-grid`, etc. ya NO existen en el HTML).

### 8.4 MISIONES (6) - api/interacciones.js

DAG via `requiere`, evaluadas por `evaluarMisiones()` tras cada POST con XP
(progreso_misiones con merge `||`, bonus XP sumado a `xp_total`):

| ID | Grupo | Requiere | XP | Condicion |
|---|---|---|---|---|
| `mis_primer_guardado` | general | - | 15 | 1 guardado |
| `mis_primera_resena` | general | - | 20 | 1 resena con `xp_ganado>=25` |
| `mis_primera_visita` | general | - | 15 | 1 visita |
| `mis_explorador_bogota` | ciudad | primer_guardado | 40 | 5 guardados en Bogota |
| `mis_organizador_bogota` | ciudad | explorador + primera_resena | 100 | 8 guardados Bogota + xp_total>=300; **desbloquea `organizar_actividad`** |
| `mis_nomada_digital` | categoria | primer_guardado | 30 | 3 hostales con tag coworking |

**DESBLOQUEOS** (api/usuarios.js L41): `mis_organizador_bogota ->
organizar_actividad`. `conMisiones()` expone `row.capacidades`. En index.html,
`renderOrganizarBtn` mantiene el boton `#btn-organizar` bloqueado hasta
completar `mis_organizador_bogota`.

### 8.5 LOGROS / Trofeos (16) - api/interacciones.js (ADR-012)

Shape de consola: `tier` bronce/plata/oro/platino, `xp`, fecha de desbloqueo
(`en`), `requiere`, y **rareza global % estilo Steam** en el GET.

**11 generales + 5 por ciudad** (generados desde `CIUDADES_COLECCION`):

| ID | Nombre | Tier | XP |
|---|---|---|---|
| `logr_primer_voto` | Primera calificacion | bronce | 10 |
| `logr_critico_10` | Critico | plata | 25 |
| `logr_critico_25` | Critico experto | oro | 50 |
| `logr_opinion_blog` | Lector critico | bronce | 10 |
| `logr_votos_blog_5` | Bibliotecario | plata | 25 |
| `logr_votos_blog_10` | Curador de historias | oro | 50 |
| `logr_coleccionista_10` | Coleccionista | bronce | 15 |
| `logr_coleccionista_50` | Magnate del mapa | oro | 75 |
| `logr_ciudades_5` | Viajero multiciudad | plata | 30 |
| `logr_visitas_5` | Senderista | bronce | 15 |
| `logr_visitas_20` | Nomada | oro | 50 |
| `logr_alcalde_bogota` | Alcalde de Bogota (12) | platino | 100 |
| `logr_conquistador_cartagena` | Conquistador de Cartagena (8) | oro | 75 |
| `logr_conquistador_medellin` | Conquistador de Medellin (8) | oro | 75 |
| `logr_senor_santa_marta` | Señor de Santa Marta (6) | plata | 40 |
| `logr_cali_es_colombia` | Cali es Colombia (6) | plata | 40 |

**Mecanica:**

- `evaluarLogros()` se ejecuta en los 4 POST de XP con **agregados memoizados**
  en `ctx` (totalVotos, blogVotos, blogOpiniones, ciudadesDistintas,
  guardadosCiudad) para no lanzar una query por trofeo.
- Merge `||` en `progreso_logros`; bonus XP sumado.
- **Normalizacion de ciudad:** `TRANSLATE` sin tildes + `LOWER` (en Neon
  conviven 'Bogota' y 'Bogota-con-tilde' segun el seed).
- **GET `tipo=logros&usuario_id=`:** catalogo completo con estado
  (`completada`/`pendiente`), `en` (fecha), `tier`, `requiere`, `xp` y
  `rareza_pct` calculada con `jsonb_object_keys` sobre usuarios activos;
  resumen `desbloqueados`/`total`.
- `api/usuarios.js` deriva `total_logros` del conteo de claves (como nivel/badge,
  nunca se guarda).
- **Voto rapido habilitado tambien en blog** (widget `#qr-stars`), cerrando el
  ciclo: un articulo se puntua -> la media del destino lo cuenta (resena+rating,
  ADR-007) -> +10 XP -> dispara logros de voto y la progresion.

**Regla de estabilidad:** los IDs de logros son convencion estable; cambiarlos
invalida el progreso ya persistido en `progreso_logros`.

### 8.6 Consumidores del gaming en el frontend

| Pagina | Que muestra |
|---|---|
| index.html | `updatePointsUI()` (XP/nivel/barra/badges con null-guards), `showLevelUpModal` (`#levelup-modal`), `renderOrganizarBtn`, `cargarLogros`/`renderLogrosGrid` (tier + rareza, barra X/Y), `initPoints`. Hook `window.onExploraCOUpdate`. |
| comunidad.html | User bar con XP/badges y Ranking real. |
| mi-perfil.html | Stats, badges, trofeos ("X / 16" + tier), quick actions. |
| api/utilidades.js | blog-lista con badge `[estrella] rating (N)` en blog.html. |
| api/pagina-destino.js | Widget `#qr-stars` en todas las categorias (incl. blog) con contador de opiniones. |

**Nota de estado:** BUG-028 (modal "Subiste de nivel" fantasma) fue corregido en
index.html: solo persistir `_ultimoNivelVisto` cuando `window.ExploraCO.usuario`
existe (el render pre-sesion no debe contaminar la comparacion).

---

## 9. Despliegue y verificacion (Escudo GOLD + smoke)

### 9.1 Escudo GOLD (antes de desplegar cualquier cambio)

Aplica a: `api/*.js`, `admin.html`, `pagina-destino.js`, `index.html` y a los
scripts de `scripts/` (seed/loader/smoke).

1. **Validacion de sintaxis:** `node --check <archivo>` (debe pasar limpio). Para
   admin.html/index.html, extraer el `<script>` inline a un temp y validarlo.
2. **ASCII-Safety:** cero bytes > 127, cero backticks, cero doble escape `\\u`
   en archivos serverless. Script de referencia:
   ```python
   with open('api/pagina-destino.js', 'rb') as f:
       raw = f.read()
   print("no-ASCII:", len([b for b in raw if b > 127]))   # debe ser 0
   print("doble escape:", raw.count(b'\\\\u'))             # debe ser 0
   print("backticks:", raw.count(b'`'))                    # debe ser 0
   print("module.exports:", b'module.exports' in raw)      # debe ser True
   ```
3. **Balance de divs:** `<div` == `</div>` por zona de categoria en admin.html
   (los 5 paneles `especifico-*` aislados cada uno contra el inicio de la
   SIGUIENTE categoria, evento contra su comentario de cierre), y balance del
   HTML generado por `buildHTML()` en los smoke tests.

### 9.2 Smoke tests de buildHTML() (sandbox Node vm)

- Interceptar `@neondatabase/serverless` con `scripts/fake_neon.js`.
- Leer `api/pagina-destino.js`, ejecutar en `vm.runInContext`, exponer
  `buildHTML`.
- Verificar por categoria + balance de divs + strings clave (con helper `inc()`
  para tildes entity-encoded).
- IMPORTANTE para hostal: pasar `det` explicito (habitaciones, amenidades,
  checkin, checkout) o las secciones no se renderizan (el fallback det->tags
  vive en el wrapper de produccion, no dentro de buildHTML).

### 9.3 Verificacion en produccion (post-deploy)

1. Las URLs `.html` del slug = 200 con el contenido correcto y divs balanceados.
2. `/api/destinos?cat=<categoria>` lista el slug nuevo (y `day`/`month`
   derivados de `tags.fecha_inicio` para eventos).
3. El `/sitemap.xml` dinamico incluye el slug (solo `status='published'`).
4. Las fotos responden HTTP 200 (patron BUG-022: thumbs 960px con hash real de
   Wikimedia Commons).
5. Para endpoints por id: probar con UUID real de la tabla correspondiente.

### 9.4 SEO e indexacion

- **sitemap.xml dinamico** (`api/utilidades?tipo=sitemap`) con `STATIC_PAGES` y
  `CAT_PRIORITY` (blog 0.80).
- **/blog.html** servido por SSR (`utilidades?tipo=blog-lista`) con buscador
  client-side, canonical, robots index.
- **/buscar** indexable (`utilidades?tipo=buscar`) con title/og dinamicos.
- **JSON-LD schemaLD** en pagina-destino.js (Product/LocalBusiness/BlogPosting,
  keywords multi-tema en blog).
- **robots.txt** y **/_headers** configurados. Cache: `s-maxage=10` en
  destinos.js; `no-store` en pagina-destino.js.

---

## 10. Estado actual, backlog y checklist de handoff

### 10.1 Estado actual (resumen)

- Las 5 categorias (Sitio, Hostal, Comida, Evento, Blog) tienen formulario admin
  completo conectado a Neon (motor generico TSK-012) y paginas publicas
  completas.
- Mas de 100 paginas dinamicas en produccion (sitios, hostales, comidas,
  eventos, blogs) creadas con el patron Fase 9. Total destinos ~130+ (ver
  TASKS.md para el conteo vigente).
- Gaming completo: 6 misiones, 16 logros/trofeos, XP, niveles, badges,
  leaderboard. Mapas tematicos publicos/privados implementados (backend +
  index + mapas.html).
- Sesion por email sin password, guardados/visitados en doble via
  localStorage + Neon, reseñas con dimensiones, rating/voto rapido con dedup.

### 10.2 Backlog vigente (ver NEXT.md y TASKS.md para el detalle)

- Commit + push pendientes de varias sesiones (NEXT.md lo lista en cada
  segmento: "Que sigue -> Commit + push (PENDIENTE)").
- `mi-perfil.html` sin la seccion "Mis mapas" (spec mapas publicos/privados).
- Popover "Anadir a mapa" solo en tarjetas de index, no en paginas de destino.
- `directorio.html` (general) sin connector: los slugs nuevos no aparecen sin
  edicion manual del PLACES estatico.
- Backend PUT de admin-destinos.js ignora valores vacios (no permite vaciar
  campos ya guardados).
- `scores` (calificaciones internas de hostal) viaja en el payload pero
  admin-destinos.js nunca lo persiste.
- Completar tags vacios legacy (~18 eventos y ~18 comidas) con el patron
  seed+loader.
- Infraestructura: dominio exploraco.co, Search Console, RESEND_API_KEY.
- TSK-016 (widget "Quien va este mes") en backlog social.

### 10.3 Bugs historicos que NO deben repetirse (resumen de BUGS_HISTORICOS.md)

| Bug | Leccion |
|---|---|
| BUG-002 | Doble escape `\\uXXXX` es un bug; usar escape simple. |
| BUG-006 / 018 / 019 | Funciones duplicadas entre categorias; usar prefijo por categoria y trazar dato-por-dato. |
| BUG-007 | Nombres de campo incorrectos (city/desc/tel/price) dejan campos vacios. |
| BUG-016/017/018/019 | UI construida pero silenciosamente desconectada del backend; verificar el archivo real (ADR-006) y el flujo completo. |
| BUG-020 | `window[nombreString]` contra variables `const`/`let` nunca las actualiza; mutar in-place con referencia real. |
| BUG-021 | Trigger/funcion huerfana en BD rompe los POST; toda alteracion de schema debe vivir en `db/migrations/` (ADR-008) y probar con UUID real. |
| BUG-022 | URLs de Wikimedia malformadas (thumb 1200px no estandar, hash incorrecto); verificar con `iiurlwidth=960` y hash real. |
| BUG-028 | Estado local contaminado por render pre-sesion; persistir solo con sesion real. |

### 10.4 Checklist de inicio de sesion para cualquier IA

1. Pedir a Javier el archivo mas reciente del repositorio que vaya a tocarse
   (el historial de chat NUNCA es fuente de verdad).
2. Leer en orden: PROJECT.md -> GUIA_DE_DESARROLLO.md (este) -> NEXT.md ->
   TASKS.md -> BLUEPRINT.md -> DECISIONS.md.
3. Verificar el estado de la BD en produccion (migraciones aplicadas en Neon) y
   los endpoints con UUIDs reales.
4. Ejecutar el Escudo GOLD (node --check, ASCII-safety, balance de divs) antes
   de entregar cualquier cambio en api/*.js, admin.html, pagina-destino.js o
   index.html.
5. Para cambios en admin.html usar `str.replace()` exacto via Python, nunca
   sed/bash sobre HTML complejo.
6. No asumir que el estado de TASKS.md/PROJECT.md refleja el archivo real.
7. No crear endpoints nuevos en `api/` (presupuesto 8/8 agotado); extender un
   archivo existente via query params.
8. Mantener los archivos del AI-DOS Core al dia (TASKS.md, NEXT.md,
   DECISIONS.md, BUGS_HISTORICOS.md) al cerrar una tarea.

---

## Apendice A. Glosario rapido

| Termino | Significado |
|---|---|
| ADR | Architecture Decision Record (DECISIONS.md) |
| AI-DOS Core | Conjunto de documentos del proyecto (PROJECT/BLUEPRINT/DECISIONS/TASKS/NEXT/BUGS_HISTORICOS/Reglas de Oro) |
| Escudo GOLD | Conjunto de verificaciones obligatorias antes de desplegar |
| Fase 9 | Patron seed + loader + smoke para crear una pagina dinamica |
| toPlace() | Normalizador fila Neon -> objeto cliente en api/destinos.js |
| buildHTML() | Funcion que ensambla el HTML de una pagina de destino |
| safeJSON / esc() | Helpers del motor: parseo seguro de tags y escape HTML |
| replArr / replObj | Mutacion in-place de arrays/objetos `const` (fix BUG-020) |
| merge JSONB | `tags = COALESCE(tags,'{}') || $new::jsonb` (ADR-003) |
| dedup simetrico | Un solo voto/reseña por usuario y destino (ADR-007) |

## Apendice B. Referencias cruzadas a skills de opencode

| Skill | Uso |
|---|---|
| `create-dynamic-page` | Orquesta el flujo completo de una pagina dinamica nueva (validacion, ficha, seed, loader, smoke, Escudo GOLD, produccion, docs). |
| `gold-shield` | Ejecuta el Escudo GOLD (sintaxis, ASCII-safety, balance de divs). |
| `batch-create` | Crea varias paginas dinamicas a la vez para optimizar cuota. |
| `research-destination` | Investiga un destino en multiples fuentes y genera la ficha .md. |
| `brainstorming` / `grill-me` | Afinar requerimientos y diseno antes de implementar. |
| `qa-auditor` (agente) | Auditoria y reporte (no corrige) de api/admin/pagina-destino/index. |

---

*Fin del documento. Complementa (no reemplaza) a PROJECT.md, BLUEPRINT.md,
DECISIONS.md, TASKS.md, NEXT.md y BUGS_HISTORICOS.md.*