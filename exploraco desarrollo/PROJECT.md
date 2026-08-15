# PROJECT.md - ExploraCO

## Estado del documento
- Version: v1.0 (generado bajo AI-DOS v1.1)
- Fecha: Julio 2026
- Fuente: EXPLORACO_CONTEXT_V4.md + Reglas de Oro ExploraCO v5
- Documento obligatorio del AI-DOS Core (Cap. 9.4). Es el primer documento que debe leer cualquier IA.

## 1. Objetivo del proyecto
ExploraCO es una plataforma web multi-categoria de descubrimiento y promocion de destinos en Colombia (sitios turisticos, hostales, comida y eventos), con paginas dinamicas generadas en servidor, un panel de administracion propio y un modelo de datos flexible basado en JSONB que permite escalar por categoria sin redise\u00f1ar el esquema relacional.

## 2. Alcance

### Incluido en el alcance actual
- Categoria "Sitio" turistico: completamente implementada (formulario admin con 6 sub-tabs, pagina publica con 17 secciones dinamicas).
- Categorias "Hostal", "Comida" y "Evento": completamente implementadas (Sprint 3/4/5 -- TASK-001/002/003), siguiendo el mismo patron ya validado con "Sitio".
- Categoria "Blog" (seccion Inspirate): formulario admin con multi-tema (select multiple de temas), video (oEmbed) y buscador de autor; pagina publica con cuerpo por parrafos (white-space:pre-line), video embed, chip de tema y seccion "Quien escribe" condicional por id_autor. Primera entrada real en produccion: TSK-043 (monserrate-guia-completa).
- Sistema de interacciones (rese\u00f1as, guardados, visitas, XP) y perfiles de usuario con gamificacion basica.
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

Las 4 categorias (Sitio, Hostal, Comida, Evento) tienen su formulario admin y su pagina publica completos y conectados a Neon extremo a extremo. Ademas, el proyecto tiene ya 25 paginas de destino dinamicas de curacion editorial (patron monserrate.html servidas por `api/pagina-destino.js`) cargadas en produccion: **lacandelaria.html**, **bogota.html**, **museo-del-oro.html**, **museo-botero.html**, **jardin-botanico-bogota.html**, **plaza-de-bolivar.html**, **museo-nacional.html**, **quebrada-la-vieja.html**, **cerro-de-guadalupe.html**, **parque-simon-bolivar.html**, **club-octava.html**, **theatron.html**, **video-club.html**, **mad-radio.html**, **gate-club.html**, **radio-estrella.html**, **espacio-kinder.html**, **radio-berlin.html**, **museo-santa-clara.html**, **quinta-de-bolivar.html**, **museo-de-la-independencia.html**, **parque-nacional.html**, **el-virrey.html**, **el-tunal.html** y **parque-la-florida.html** (ver TASKS.md TSK-018 a TSK-042 y NEXT.md). Estas se cargaron via la API de admin con los seeds `api/seed-*.js`/`api/load-*-api.js` versionados; destacan que su rating parte en 0 (hasta resenas reales, ADR-009) y su hero/galeria usan imagenes de Wikimedia verificadas con curl (BUG-022). Las 8 de electronica (cat sitio) usan covers/hero con fotos de barrio de Commons, las 3 ultimas son museos faltantes con fotos propias de Commons y los 4 parques de Bogota (Parque Nacional, El Virrey, El Tunal y La Florida) cierran la curaduria de parques urbanos (total destinos 107).

Ademas, la seccion Inspirate (blog) tiene desde esta sesion su **primera entrada real en produccion**: **monserrate-guia-completa.html** (slug `monserrate-guia-completa`, categoria `blog`, `status='published'`, `destacado=true`) -- "El cerro que vigila a Bogota: guia completa para subir a 3.152 m", con cuerpo ~6.250 palabras en descripcion TEXT, 5 FAQs, video de YouTube verificado via oEmbed y tags JSONB multi-tema (`tags.temas[]` + `tags.tema` primario). Sin `id_autor` por ahora (migracion 004 pendiente; el autor se asignara desde admin.html despues). Archivos: `api/seed-monserrate-guia.js`, `api/load-monserrate-guia-api.js` y `ficha-monserrate-guia.md` (ver TASKS.md TSK-043). El soporte multi-tema (TSK-044) ya esta implementado en `api/destinos.js`, `index.html`, `api/pagina-destino.js` y `admin.html`, pero NO esta desplegado (el deploy de Vercel sigue bloqueado -- ver NEXT.md TASK-011).

| Categoria | Admin (formulario) | Pagina publica | Estado |
|---|---|---|---|
| Sitio | Completo | Completo (17 secciones) | Activo en produccion |
| Hostal | Completo | Completo | Activo (Sprint 3, TASK-001) |
| Comida | Completo | Completo | Activo (Sprint 4, TASK-002) |
| Evento | Completo | Completo (5 secciones) | Activo (Sprint 5, TASK-003) |
| Blog | Completo (temas multi-select, video, autor) | Completo (Inspirate, video embed, temas) | Activo (TSK-043; primer post real en produccion) |

El baseline tecnico actual es admin.html (~7.800 lineas, referencial), pagina-destino.js v9 (1.265 lineas) y admin-destinos.js v2.1 (reescrito para corregir el bug historico de nombres de campo incorrectos; sin cambios desde Sprint 2 -- el MERGE JSONB ya cubre los campos nuevos de las 4 categorias). Ver NEXT.md para el detalle de continuidad y BUGS_HISTORICOS.md para fallas ya resueltas que no deben repetirse -- en particular, las 3 ultimas categorias (BUG-016/017/018/019) revelaron el mismo patron: UI ya construida en el admin pero silenciosamente desconectada del backend, pese a que la documentacion decia "Pendiente". Ver DECISIONS.md ADR-006 sobre por que nunca confiar en un estado citado sin verificar el archivo real.

Desde TASK-007 (Sprint 6), index.html ya no incluye datos locales de respaldo (`PL[]`/`MAPA_PLACES[]` hardcodeados): el listado principal y el mapa se cargan en tiempo real desde `/api/destinos` a traves de `index-api-connector.js`. Ese script ya estaba en produccion desde antes de esta tarea, pero no figuraba en ningun documento del AI-DOS Core; queda documentado formalmente en BLUEPRINT.md seccion 5-bis. Persisten como contenido estatico, fuera del alcance de TASK-007 y sin afectar la carga principal de destinos: `SLIDES[]` (hero/slideshow), `MM_PINS[]` (pines decorativos de "Mi Mapa", con desfase de ids conocido, ver NEXT.md) y la porcion hardcodeada de `AGENDA_EVENTS[]` (el conector antepone los eventos reales de Neon sin eliminar los de ejemplo).

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
