# RUTA DE MEJORA - ExploraCO

Roadmap integral de mejoras del sitio, consolidado a partir del estado real del
repositorio (`NEXT.md`, `TASKS.md`, `DECISIONS.md`, `BUGS_HISTORICOS.md`) y la
deuda tecnica vigente. Ordenado por prioridad (P0 -> P4). Se actualiza con cada
relevo; no reemplaza a NEXT.md sino que lo complementa como hoja de ruta.

## Estado actual (resumen)

- Sitio estatico en Vercel con backend serverless (8 endpoints) + Neon PostgreSQL.
- Motor de paginas dinamicas (pagina-destino.js) por categoria (sitio/hostal/comida/evento).
- Agenda cultural con ingesta automatizada (Gemini + conector Hostal Terraza).
- Panel admin (admin.html) con blog, mapas, gaming (logros/trofeos), planes.
- Sistema de ruteo por costo de subagentes (ADR-006).
- Gaming v5.0 (20 niveles/4 eras, 28 misiones, 30 logros, 13 consumibles, cromos,
  referidos, Wayfarer, facciones, vocaciones) y apartado social de 7 tabs.
  Migracion 016 pendiente en Neon. Detalle en los documentos maestros v5
  (`ampliacion desarrollo/ExploraCO_Gamificacion_v5_Plan_Maestro.md` y
  `ampliacion desarrollo/ExploraCO_Sistema_Social_v5.md`).

## P0 - Higiene y deuda pendiente (desbloquea todo lo demas)

1. **Commit + push de sesiones sin subir.** Hay multiples `PENDIENTE de commit+push`
   acumuladas: TSK-071 (blog admin), TSK-072/073 (hostales/directorios), TSK-074
   (eventos), TSK-075/ADR-013 (campo web), TSK-077/078/079/080 (directorios y
   Milestones v2). Revisar `git status`/`git log`, commitear por sesion.
2. **Migracion Neon pendiente (bloqueada en Javier).**
   - Migracion **016** (`db/migrations/016_multinivel_crowdsourcing.sql`) -
     **PENDIENTE de aplicar en Neon (BLOQUEANTE)**: sin ella fallan referidos,
     facciones, Activo Oculto y `geo_nonces`. Checklist: `docs/DEPLOY_016.md`.
   - Variables de entorno de la Entrega 016: `SESSION_JWT_SECRET` (nueva,
     obligatoria) y `RESEND_API_KEY` (pendiente desde TASK-006), mas `SITE_URL`.
   - Migraciones 004/005/007/011/012/013/014: **YA APLICADAS** en Neon (NEXT.md,
     sesiones TSK-097..100). La 015 es prerrequisito declarado de la 016:
     confirmarla en Neon antes de aplicar la 016 (ADR-006).
3. **`scores` de Hostal sin persistir** (BUG-016): viaja en el payload pero
   `admin-destinos.js` nunca lo escribe. Decidir si se implementa o se cierra.

## P1 - Calidad de datos legacy (prioridad ya anotada en el repo)

4. Completar **tags/fecha/descripcion** de los ~18 eventos y ~18 comidas con tags
   vacios (patron seed+loader de TSK-057..063).
5. **Re-seedear ratings hardcodeados a 0** (ADR-009: sin ratings inventados).
6. Revisar **slugs que ensombrecen rewrites** (estaticos ~205KB) para que las
   paginas dinamicas no queden ocultas por archivos estaticos.

## P2 - Backlog Social (Sprint 4)

7. TSK-015/016/017: "Quien va este mes", comparador, y secciones bespoke de
   ciudad-perdida.html. TSK-016 (widget "Quien va este mes") es el mas corto.
   - **Detalle v5:** el estado real y los gaps del apartado social estan
     documentados en `ampliacion desarrollo/ExploraCO_Sistema_Social_v5.md`
     (secciones 9, 10 y 15): referidos sin frontend (`registro.html` inexistente,
     D-09/G-12), checkin de Activo Oculto sin UI (D-13), afinidad de Parche y
     control territorial solo documentados (G-10/G-11), `album_voto` sin UI
     (G-07), perfil publico `?id=` no soportado (G-14) y notificacion de resena a
     `/api/notificaciones` inexistente (G-15). El gaming completo, en
     `ampliacion desarrollo/ExploraCO_Gamificacion_v5_Plan_Maestro.md`.

## P3 - Fix estructurales

8. Migrar `mm_saved` (mapa personal) de ids posicionales a **slugs/UUIDs**
   (TSK-070) para eliminar dependencia del ORDER BY del API entre sesiones.
9. **Sincronizacion programada** (GitHub Action cron) del conector Hostal
   Terraza (pendiente TSK-088) para que corra solo antes de cada publicacion.
10. Extender visibilidad del campo `web` al home (backlog TSK-075/ADR-013).

## P4 - Oportunidades nuevas (a discutir)

11. SEO: revisar sitemap.xml, meta/Open Graph, Search Console.
12. Rendimiento: optimizacion de imagenes (thumbnails Wikimedia 960px), lazy load.
13. Contenido: los 2 posts de blog propuestos pero no publicados.
14. Automatizacion de informes de cuota (ver `scripts/informe-cuota.js`):
    convertir la generacion bajo demanda en una tarea programada (cada 5h + diaria)
    si se quiere sin intervencion manual.

## Como se generan los informes de cuota

```bash
node scripts/informe-cuota.js --5h   # ultimas 5 horas
node scripts/informe-cuota.js --dia  # dia natural de hoy
node scripts/informe-cuota.js --desde=YYYY-MM-DD
```

Salida: consola + `exploraco desarrollo/informes-cuota/cuota-<fecha>-<ventana>.md`.
Lee `~/.local/share/opencode/opencode.db` en modo read-only (no bloquea opencode).
