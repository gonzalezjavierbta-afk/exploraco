# Epic prompt.txt — Museo de trofeos, vocaciones de artista, chat por niveles y fixes multimedia

Fecha: 2026-09-13
Autor: free-build (orquestador gratuito)
Estado: APROBADO por Javier (decisiones Q1-Q5)

## Alcance

Epic de 5 features + 2 bugs solicitado desde `prompt.txt` en la raiz del repo:

1. **mi-perfil.html como museo de trofeos**: presentacion del usuario con viajes,
   trofeos/logros, audiovisuales y mapas; mejoras de perfil desbloqueables por
   nivel y por consumibles.
2. **Vocaciones de artista desbloqueables (estilo Diablo/PoE/Albion)**: rutas
   Músico, Cine y Artista grafico, cada una con habilidades por nivel.
   **Acumulables** (ventaja de elegir varias).
3. **Comunidad**: solo quedan las salas del sistema "Chat general" y "Bogota"
   (mas las creadas por usuarios); se eliminan Cartagena, Medellin, Costa
   Caribe y Naturaleza y trekking. Mejoras de chat desbloqueables por nivel.
4. **Planes con chat propio privado**: cada plan crea una sala de chat solo
   para miembros.
5. **Admin: asignar XP** — con "subir a nivel X exacto" (recalcula el XP al
   minimo del umbral del nivel).
6. **BUG A (503 album_detalle)**: degradacion elegante del contador de
   comentarios cuando la tabla album_comentarios no existe (migracion 013).
7. **BUG B (mapa cultural sin fotos de usuarios)**: los albumes sin lat/lng
   nunca aparecen en `multimedia_mapa`; heredar coords y avisar en el perfil.

Decisiones de producto (Javier, 2026-09-13):
- Vocaciones acumulables (si, todas las que el usuario desbloquee).
- Mejoras de perfil implementadas en esta iteracion: marco dorado, tema
  galeria oscura, banda de artista. (Vitrina extendida y sello de verificado
  quedan como futuro cercano.)
- Chat de plan: privado solo para miembros.
- Admin XP: modo "subir a nivel exacto" + suma/resta manual.
- Migraciones 011-014 YA aplicadas por Javier en Neon (falta documentarlas);
  las migraciones nuevas de este epic las aplica el mismo despues del commit.

## Arquitectura

Sin endpoints serverless nuevos (presupuesto Vercel Hobby 8/8, ADR-010):
todo via nuevos `tipo=` en `api/interacciones.js` (y `buscar` en
`api/usuarios.js`).

### Base de datos — `db/migrations/015_epic_prompt.txt.sql` (nueva)

1. **Vocaciones**: `usuarios.vocaciones jsonb NOT NULL DEFAULT '{}'::jsonb`.
   Catalogo versionado en codigo (no en DB, mismo patron que LOGROS).
2. **Chat por plan**: `planes_viaje.sala_id uuid` (FK a chat_salas, null ok).
   Al crear plan -> se crea chat_sala con `tipo='plan'`, `creador_id` = creador
   del plan; se liga `sala_id`.
3. **Limpieza de salas del sistema**: UPDATE soft-flag o DELETE de las salas
   con `creador_id IS NULL` cuyo nombre NO sea 'Chat general' ni 'Bogota'
   (idempotente por nombre).
4. Mejoras de chat por nivel se modelan como **capacidades** (sin columnas).

### Backend — `api/interacciones.js` (asi se mantiene el header version)

- **BUG A**: helper `contarComentarioSafe(sql, fotoId)` que intenta la
  subquery de album_comentarios y ante `42P01`/`42703` devuelve 0 sin 503.
  Aplicar en `album_detalle`, `galeria_destino`, `mi_feed_fotos`,
  `fotos_top` y `multimedia_mapa`.
- **BUG B**: `multimedia_mapa` relaja la exigencia de lat/lng del album:
  usa `COALESCE(a.lat, d.lat)` cuando la foto del album referencia (campo a
  definir: `album_fotos.destino_id` ya no existe; se usara el lat/lng que el
  usuario cargue en el album O la primera interaccion `visita`/`guardado`
  del autor hacia un destino con coords como fallback). Mantener `origen=album`.
- **Chat por plan**: GET `plan_chat` (sala del plan + mensajes, gate miembro),
  POST `plan_chat_msg` (gate miembro + capacidad chat, +2 XP tope 20/dia),
  POST `plan_chat_salir` no aplica (salir del plan ya desliga). Reuso de
  helpers chatXpDisponible/registrarChatXp.
- **XP admin**: POST `admin_xp` (Bearer ADMIN_SECRET): body
  `{usuario_email|usuario_id, delta_xp}` y `{nivel}` para subir a nivel
  exacto (xp = NIVELES[nivel-1].min). Actualiza xp_total y devuelve nuevo
  nivel/badge.
- **Vocaciones**: GET `vocaciones_catalogo` (publico), POST `vocacion_activar`
  (gate por nivel/consumible), GET `vocacion_usuario` opcional dentro de
  `/api/usuarios?id=` (columna ya seleccionada con SELECT *).

### Backend — `api/usuarios.js`

- `buscar`: GET `?buscar=palabra` (ILÍKE nombre/email, limite 20) para
  admin.html y el buscador del perfil. Exponer tambien `vocaciones` en la
  respuesta del perfil (SELECT * ya la incluye; agregar catalogo).
- `perfil_tipo` (columna legacy) NO se usa: vocaciones viven en su columna.

### Frontend

#### mi-perfil.html (frontend-tpl-free)
- Nueva seccion "Museo": vitrina de trofeos (logros en pedestales), mapa de
  viajes (Leaflet), audiovisuales (albumes propios), coleccion de cromos.
- Seccion "Galeria de mejoras": 3 modificadores (marco dorado, tema galeria
  oscura, banda de artista) desbloqueados por nivel; activacion con
  consumible (reuso de `usar_consumible` -> tags nuevos en consumibles).
- Seccion "Vocaciones": 3 tarjetas (Musico/Cine/Artista grafico) con su
  nivel de desbloqueo y habilidades; activar/desactivar (acumulables).
- Aviso "Este album no aparece en el mapa cultural — agrega ubicacion" en el
  editor de album cuando lat/lng esten vacios, con boton autocompletar.
- Balance de divs y Escudo GOLD al cerrar.

#### comunidad.html (frontend-tpl-free)
- `renderChatRooms()` ya consume `chat_salas` de la API: la limpieza de
  salas ocurre en la DB, no en el HTML (no requiere cambio de listado; se
  agrega filtro defensivo `s.tipo === 'plan'` -> no listar salas de plan en
  el tab Chat general).
- Mejoras de chat por nivel: badges/hints en los gates (crear sala, fijar
  mensaje, emojis premium, sello de sala) alimentados por capacidades.
- Tab Planes: al abrir un plan (o al estar unido) boton "Chat del plan"
  -> modal con mensajes de la sala ligada; permisos por membresia.

#### admin.html (admin-dev-free)
- Nueva seccion "Jugadores": buscador (`api/usuarios?buscar=`), tarjeta del
  usuario (nivel, XP, era, vocaciones, total_logros) y dos acciones:
  (a) sumar/restar XP manual (delta), (b) "Subir a nivel X" con select 1-20
  que recalcula XP al minimo del umbral + guarda.
  Pipe al POST `admin_xp` con Bearer ADMIN_SECRET.

#### usuario-session.js (js-silo-dev-free)
- CAPACIDADES_POR_NIVEL: agregar `emojis_premium@7`, `sello_sala@10` (y
  reusar crear_chat/moderador_chat existentes.
- `window.ExploraCO.vocaciones`: catalogo liviano (id, nombre, emoji, nivel,
  habilidades[]) para pintar en perfiles ajenos (id= en mi-perfil).
- `subirNivelTest(n)`: helper admin (usa admin_xp o calcula umbral local).

### QA (qa-auditor)
- Escudo GOLD completo: node --check api/*.js, ASCII-safety (0 bytes>127 en
  lineas nuevas), balance de divs en mi-perfil/comunidad/admin, smoke
  existentes (comunidad 30, perfil_progreso, logros, auditoria 42,
  check_buildHTML_inline).
- Nuevo smoke: `scripts/smoke_epic_prompt.js` (vocaciones, admin_xp niveles
  1-20, plan_chat gate miembro vs no-miembro, contarComentarioSafe sin
  tabla, multimedia_mapa sin coords de album).

## Verificacion

1. node --check + ASCII + divs por archivo.
2. smoke_epic_prompt PASS (10-15 checks).
3. smokes heredados sin regresion.
4. qa-auditor reporta; se corrigen hallazgos de scope (patron BUG-020).
5. docs-keeper: migracion 015 + ADR-026 (epic) + actualizar NEXT/TASKS +
   documentar que 011-014 fueron aplicadas por Javier (nota en NEXT).

## Archivos

- db/migrations/015_epic_prompt.txt.sql (NUEVO)
- api/interacciones.js, api/usuarios.js
- mi-perfil.html, comunidad.html, admin.html, usuario-session.js
- scripts/smoke_epic_prompt.js (NUEVO)
- docs (TASKS.md, NEXT.md, DECISIONS.md ADR-026, BUGS si aplica)