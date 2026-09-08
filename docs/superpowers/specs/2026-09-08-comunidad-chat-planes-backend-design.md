# Chat y Planes reales con gaming completo en comunidad.html

**Fecha:** 2026-09-08
**Estado:** Implementado
**Archivos afectados:** `db/migrations/008_comunidad_social.sql` (nuevo), `api/interacciones.js` (GET/POST nuevos + MISIONES +3 + LOGROS +3), `comunidad.html` (tabs Chat/Planes reales, fix XSS, sin demo), `scripts/test_logros_catalogo.js` (19 -> 22), `scripts/smoke_test_comunidad.js` (nuevo).

## Contexto

`comunidad.html` tenia chat y planes como demo local (MOCK_MESSAGES / PLANES_DATA en memoria, sin backend ni XP) -- decision D7 de la spec de comunidad unificada (2026-09-07). Ademas: XSS por `innerHTML` con texto de usuario (chat, salas, planes), `spots` que no reflejaba cupos reales, el creador podia unirse a su propio plan, `modDelMsg` inefectivo en rooms mock, y un desajuste de producto: las capacidades `chat`/`moderador_chat`/`crear_chat` ya existian en backend (api/usuarios.js DESBLOQUEOS, misiones umbral 250/450/700 XP) pero solo abrian una UI falsa.

## Decisiones de producto (calibradas con Javier)

1. **XP de chat +2 por mensaje con tope diario de 20 XP** (10 mensajes/dia). Contador en `usuarios.progreso_social` `{chat_dia: 'YYYY-MM-DD', chat_n: N}`.
2. **Crear plan gateado por avance:** requiere chat desbloqueado (`mis_chat_mensajero`, nivel 3 / 250 XP). Unirse a planes es libre para registrados.
3. **Sin sesion = todo bloqueado:** chat y planes muestran CTA de login; se elimina el fallback demo local para ambos tabs (Ranking conserva su fallback).

## Esquema (db/migrations/008_comunidad_social.sql)

- `chat_salas(id uuid PK, nombre text, icono text, descripcion text, tipo text, orden int, creador_id uuid NULL, creado_en timestamptz, activo bool)` + indice `(orden DESC, creado_en ASC)` + seed idempotente de 6 salas del sistema (general, Bogota, Cartagena, Medellin, Costa Caribe, Naturaleza) con emojis `E'\U...'` (BUG-026).
- `chat_mensajes(id uuid PK, sala_id uuid FK CASCADE, usuario_id uuid, nombre text, texto text, fijado bool, activo bool, creado_en)` + indice `(sala_id, creado_en DESC)`.
- `planes_viaje(id uuid PK, destino text, fechas text, cupos int, descripcion text, creador_id uuid, creado_en, activo)`.
- `planes_miembros(plan_id, usuario_id, creado_en, PK(plan_id,usuario_id))`.
- `usuarios + progreso_social jsonb DEFAULT '{}'`.
- Idempotente (IF NOT EXISTS, ADR-008) y ASCII-safe (0 bytes > 127).

## Backend (api/interacciones.js, sin endpoint nuevo)

Helpers nuevos: `misionCompletada(sql, uid, misionId)` (gate por progreso_misiones), `chatXpDisponible`/`registrarChatXp` (anti-farming diario). Ambos degradan sin lanzar.

GET:
- `?tipo=chat_salas` -> salas con ultimo mensaje, autor y total.
- `?tipo=chat_mensajes&sala_id=` -> ultimos 100 (mas recientes primero; el frontend invierte).
- `?tipo=planes&usuario_id=` -> planes con miembros_actuales (COUNT) y `unido` (EXISTS).
- `?tipo=planes_mios&usuario_id=` -> planes del usuario.

POST (patron body.tipo + usuario_id):
- `chat_sala` (gate crear_chat), `chat_msg` (gate chat, texto <= 500, +2 XP con tope diario, evalua misiones/logros), `chat_mod` (gate moderador_chat; fijar toggle / eliminar soft-delete), `plan_crear` (gate chat; valida destino/cupos 1-50), `plan_unirse` (dedup PK -> 409, 403 si es plan propio, 409 si lleno), `plan_salir`.

Gaming nuevo:
- Misiones: `mis_chat_activo` (+20, 10 mensajes), `mis_plan_creador` (+25, 1 plan), `mis_plan_unido` (+15, 1 join).
- Logros: `logr_social_chat` (+30, 50 mensajes, plata), `logr_social_plan` (+35, 3 planes, oro), `logr_anfitrion` (+50, plan con 5+ viajeros, oro). Catalogo LOGROS 19 -> 22.

## Frontend (comunidad.html)

- **Fix XSS:** `esc()` en todo texto de usuario (chat, salas, planes); avatar con color determinista por nombre.
- Chat: lista de salas desde `?tipo=chat_salas`; ventana con `?tipo=chat_mensajes`; **polling cada 5s**; envio optimista + XP toast; botones moderador solo con `moderador_chat`; "+ Nueva sala" solo con `crear_chat`.
- Planes: grid desde `?tipo=planes` con cupos = `cupos - miembros`; formulario de creacion (no `prompt`), visible solo con chat desbloqueado; unirse/salir; sin poder unirse al propio plan.
- Sin sesion: tabs bloqueados con CTA de login (`loginGate()`).
- Div balance 86/86; JS inline `node --check` OK.

## Verificacion

- `node --check api/interacciones.js` OK; ASCII 0 bytes > 127; backticks 0.
- `scripts/test_logros_catalogo.js` 12/12 PASS (LOGROS 22).
- `scripts/smoke_test_comunidad.js` 30/30 PASS (catalogo, 4 GET, 6 POST registrados, gates 403, anti-farming).
- Div balance comunidad.html 86/86.

## Pendiente

- Aplicar `db/migrations/008_comunidad_social.sql` en Neon (Javier) antes del deploy. Sin ella: GET/POST de chat y planes fallan con error SQL y las misiones/logros nuevos degradan a no-completadas.
- Deploy y verificacion en vivo (polling de chat, XP toasts, dedup de planes).