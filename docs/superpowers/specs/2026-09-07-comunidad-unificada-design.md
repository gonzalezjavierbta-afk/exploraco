# Comunidad unificada en comunidad.html + eliminación de módulo social del index

**Fecha:** 2026-09-07
**Estado:** Implementado
**Archivos afectados:** `comunidad.html` (hub unificado), `index.html` (se remueve módulo social + página admin dejamos de vincular + onboarding y reseñas estáticas D4), `viajeros.html` y `mi-perfil.html` (ELIMINADOS), `directorio-sitio/hostal/comida/evento.html` y `mapas.html` (links a comunidad.html), `api/utilidades.js` (sitemap viajeros.html → comunidad.html), `scripts/seed-barichara.js` (nuevo, seed real de Barichara), `scripts/smoke_test_barichara.js` (nuevo).

## Contexto

Todo el módulo "social" (badges, XP, comunidad) vivía embebido en `index.html` en un `<section class="social-section">` con su propio JS (~700 líneas) y su modal de registro ("onboarding"). Además existían páginas solapadas (`viajeros.html`, `mi-perfil.html`) que el navbar del index enlazaba (viajeros, mi perfil, admin) creando fragmentación y links muertos/dispersos.

Se pidió **unificar toda la parte social/comunidad en un solo hub** (`comunidad.html`) con **datos reales de Neon** vía `window.ExploraCO.usuario`, quitando el módulo social embebido del `index.html`, y **reemplazar `barichara-pueblo.html` estático** por dinámico (seed con contenido real). El Admin queda accesible solo por URL directa (fuera del menú). Se eliminan `viajeros.html` y `mi-perfil.html`.

## Decisiones tomadas (D1-D8)

1. **D1 — Eliminar páginas huérfanas:** `viajeros.html` y `mi-perfil.html` se borran; todos sus links redirigen a `comunidad.html`.
2. **D2 — Perfil unificado:** "Mi Perfil" vive como primer tab de `comunidad.html`, alimentado por `window.ExploraCO.usuario` (datos de Neon: `xp_total`, `total_guardados`, `total_visitas`, `total_resenas`, `total_logros`).
3. **D3 — Barichara dinámico:** seed `scripts/seed-barichara.js` (idempotente, `ON CONFLICT (slug) DO UPDATE`) llena el slug `barichara-pueblo` con 7 fotos, coordenadas y FAQS reales.
4. **D4 — Limpieza de reseñas estáticas:** las 4 reseñas hardcodeadas del index se eliminan.
5. **D5 — Admin fuera del menú:** los links del navbar, drawer y footer a `admin.html` se quitan (sigue en pie por URL directa).
6. **D6 — Onboarding fuera del index:** modal "50 XP de bienvenida" y su CSS/JS se eliminan del index; el alta real es el flujo login de `usuario-session.js`.
7. **D7 — XP local de chat/planes elimina:** el chat y planes en comunidad.html son demo local **sin XP** (no inventar puntos que no existen en Neon); los trofeos y el perfil sí usan datos reales.
8. **D8 — Seguridad de codificación:** todo el reescritura se hizo con Node.js (lectura/escritura UTF-8 explícita), NUNCA PowerShell `Get-Content`/`WriteAllLines` (incidente histórico de mojibake al doblar UTF-8→ANSI→UTF-8).

## Estructura final de comunidad.html

- `<nav>` fija con back a index.
- **GATE** (cuando no hay sesión) → CTA "🔑 Iniciar sesión" que llama `window.ExploraCO.mostrarLogin()` (con fallback). Ya NO hay registro inline ni "50 XP de bienvenida".
- **Tabs** (en orden): 👤 Mi Perfil (activo por defecto) · 💬 Chat · 🗺️ Planes · 🏅 Logros · 👤 Viajeros.
- **cpanel-perfil:** avatar con iniciales, nombre, nivel (XP_LEVELS), barra de XP, stats (XP/Guardados/Visitados/Reseñas), grid de badges (`perfil-badges-grid`), botones "Mi Mapa" y "Explorar".
- **cpanel-logros:** trofeos REALES desde `GET /api/interacciones?tipo=logros&usuario_id=` (usa `window.ExploraCO.usuario.id`), grid estilo Steam con tier y rareza global; fallback a mensaje de sesión/carga. Incluye bloque "Siguientes pasos" (`comm-quick-actions`, informativo, sin otorgar XP local).
- **cpanel-viajeros:** leaderboard real `GET /api/usuarios?tipo=leaderboard` con fallback a MOCK local para demo sin sesión.
- Chat y Planes: demo local (MOCK_MESSAGES / PLANES_DATA) — sin XP.
- Script principal inline (406 líneas) + `<script src="usuario-session.js">` al final (después del inline, para que `usuario-session.js` sobrescriba `window.onExploraCOUpdate` y lo invoque en su `init()`).

## Cambios en index.html

Se removieron (vía splice Node.js byte-safe):
- Navbar/drawer/footer: links a `viajeros.html`, `mi-perfil.html`, `admin.html` — Comunidad ahora enlaza con highlight activo.
- Bloque **CSS Social** (`/* SOCIAL FEATURES */` … `.social-toast.show`).
- El `<section class="social-section" id="social-section">` completo + `#social-toast`.
- Modal `#edit-profile-modal`.
- **Bloque JS Social** (estado, registro gate, renderUserBar, renderBadgesGrid, chat, planes, viajeros, saveProfile patch, puntosUsuarioActual `origin:''`, onboarding JS, SOCIAL INIT IIFE).
- CSS onboarding (`#onboarding-modal`, `.ob-*`).
- Modal onboarding HTML.
- 4 reseñas estáticas (D4).
- Pill navbar onclick → `window.location.href='comunidad.html'` (en vez de scroll a social-section).

Igual que antes: `XP_LEVELS`, `BADGES`, `updatePointsUI`, `initPoints`, nivel-up modal y la sección Mi Mapa / Inspirate quedan intactos (null-guards en IDs removidos → seguro).

## Seguridad / verificación

- Div balance (HTML puro, sin `<script>`): index 320/320, comunidad 102/102.
- `node --check` del JS inline extraído de ambos HTML = OK.
- Script server (`api/utilidades.js`) `node --check` = OK; sitemap actualizado.
- `scripts/seed-barichara.js` y `scripts/smoke_test_barichara.js` validados ANTES del incidente de encoding (smoke ALL PASS; `DATABASE_URL` no configurada localmente → seed pendiente de ejecutar contra Neon).
- Verificación de mojibake (U+FFFD = 0 en comunidad.html; em-dash correcto).
- No quedan referencias a `viajeros.html`/`mi-perfil.html` en HTML/JS/conf de producto (solo comentarios históricos en `api/interacciones.js` y specs).

## Pendiente

- Ejecutar el seed de Barichara contra Neon (`DATABASE_URL` no definida localmente).
- Verificación visual en navegador y commit posterior (el usuario no pidió commit).