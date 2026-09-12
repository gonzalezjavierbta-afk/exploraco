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

## P0 - Higiene y deuda pendiente (desbloquea todo lo demas)

1. **Commit + push de sesiones sin subir.** Hay multiples `PENDIENTE de commit+push`
   acumuladas: TSK-071 (blog admin), TSK-072/073 (hostales/directorios), TSK-074
   (eventos), TSK-075/ADR-013 (campo web), TSK-077/078/079/080 (directorios y
   Milestones v2). Revisar `git status`/`git log`, commitear por sesion.
2. **Migraciones Neon pendientes (bloqueadas en Javier).**
   - Migracion 007 (Milestones v2, `api/interacciones.js`) - PENDIENTE de aplicar.
   - Migracion 005 - PENDIENTE de deploy (fix en `api/destinos.js`).
   - Migracion 004 (blog multi-tema/autor) - opcional.
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
